// The model viewer's three.js scene: renderer, camera, orbit controls, lights, grid, axes, wireframe and
// point-to-point measurement. It renders on demand (after a change, while damping settles, or while the turntable
// spins), and owns every GPU resource it creates so `dispose` frees them all.
import {
  AxesHelper,
  Box3,
  BufferGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { fitDistance, niceCeil, viewDirections, type ModelView } from './geometry';
import { meshOf, type AnyMesh, type LoadedModel } from './loadModel';

/** What `onLoad` reports: the triangle count and the model's size along its own x, y and z axes. */
export interface ModelInfo {
  triangles: number;
  bounds: { x: number; y: number; z: number };
}

/** The scene's colours, from the theme tokens. */
export interface SceneColors {
  background: string;
  model: string;
  grid: string;
  gridCenter: string;
  axisX: string;
  axisY: string;
  axisZ: string;
  measure: string;
  groundLight: string;
}

function read(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = style.getPropertyValue(name).trim();
  return value === '' ? fallback : value;
}

/** Reads the scene's colours from the tokens on `element` (read again when the theme changes). */
export function readSceneColors(element: Element): SceneColors {
  const style = getComputedStyle(element);
  return {
    background: read(style, '--color-surface-2', '#ffffff'),
    model: read(style, '--color-heat-neutral-4', '#8f96a1'),
    grid: read(style, '--color-border', '#d5d9e0'),
    gridCenter: read(style, '--color-border-strong', '#7d8594'),
    axisX: read(style, '--color-danger-solid', '#c62f2b'),
    axisY: read(style, '--color-success-solid', '#1d7a3e'),
    axisZ: read(style, '--color-accent-solid', '#2557d6'),
    measure: read(style, '--color-focus', '#2557d6'),
    groundLight: read(style, '--color-heat-neutral-2', '#ced2d8'),
  };
}

/** Measurement progress: how many points are placed, and the distance once there are two. */
export interface MeasureState {
  points: 0 | 1 | 2;
  distance: number | null;
}

function countTriangles(object: Object3D): number {
  let count = 0;
  object.traverse((child) => {
    const mesh = meshOf(child);
    if (mesh) {
      const { geometry } = mesh;
      const vertices = geometry.index?.count ?? geometry.getAttribute('position').count;
      count += Math.floor(vertices / 3);
    }
  });
  return count;
}

function materialsOf(mesh: AnyMesh | Line): Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

/** Frees an object's geometries, and its materials and their textures (except `keep`, which is shared). */
function disposeObject(object: Object3D, keep?: Material) {
  object.traverse((child) => {
    if (child instanceof Mesh || child instanceof Line) {
      (child.geometry as BufferGeometry).dispose();
      for (const material of materialsOf(child as AnyMesh)) {
        if (material === keep) {
          continue;
        }
        for (const value of Object.values(material)) {
          if (value instanceof Texture) {
            value.dispose();
          }
        }
        material.dispose();
      }
    }
  });
}

const FOV = 40;

export class ModelScene {
  readonly canvas: HTMLCanvasElement;
  /** Called when the user starts moving the view (the turntable stops then). */
  onInteract: (() => void) | undefined;
  /** Called as measurement points are placed. */
  onMeasure: ((state: MeasureState) => void) | undefined;

  private readonly container: HTMLElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 1000);
  private readonly controls: OrbitControls;
  private readonly pivot = new Group();
  private readonly ground = new HemisphereLight(0xffffff, 0xcccccc, 1.4);
  private readonly material = new MeshStandardMaterial({ roughness: 0.55, metalness: 0.1 });
  private readonly measureGroup = new Group();
  private readonly raycaster = new Raycaster();
  private colors: SceneColors;
  private content: Object3D | null = null;
  private grid: GridHelper | null = null;
  private axes: AxesHelper | null = null;
  private hasGrid = false;
  private hasAxes = false;
  private isWireframe = false;
  private isMeasuring = false;
  private points: Vector3[] = [];
  private modelBox = new Box3();
  private center = new Vector3();
  private radius = 1;
  private frame = 0;
  private pointerStart: Vector2 | null = null;

  /** Throws when WebGL isn't available. */
  constructor(container: HTMLElement, colors: SceneColors) {
    this.container = container;
    this.colors = colors;
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'block size-full';
    container.append(this.canvas);

    // The key light rides with the camera, above and to the right, so faces stay distinct from every angle.
    const key = new DirectionalLight(0xffffff, 2.4);
    key.position.set(1, 0.9, 0.6);
    key.target.position.set(0, 0, -1);
    this.camera.add(key, key.target);
    this.scene.add(this.camera, this.ground, this.pivot, this.measureGroup);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.autoRotateSpeed = 1.5;
    this.controls.addEventListener('change', this.requestRender);
    this.controls.addEventListener('start', this.handleStart);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);

    this.setColors(colors);
    this.resize();
  }

  /** Shows a loaded model, framed in the iso view, and returns what `onLoad` reports. */
  setModel(model: LoadedModel, upAxis: 'y' | 'z'): ModelInfo {
    this.clearModel();
    const { object } = model;
    if (model.isUncoloured) {
      object.traverse((child) => {
        const mesh = meshOf(child);
        if (mesh) {
          for (const material of materialsOf(mesh)) {
            material.dispose();
          }
          mesh.material = this.material;
        }
      });
    }
    this.content = object;

    // The size in the model's own axes, before turning it upright.
    this.pivot.position.set(0, 0, 0);
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.add(object);
    this.pivot.updateMatrixWorld(true);
    this.modelBox = new Box3().setFromObject(object);
    const size = this.modelBox.getSize(new Vector3());

    // Turn it so its up axis points up the screen, then stand it on the floor, centred.
    this.pivot.rotation.x = upAxis === 'z' ? -Math.PI / 2 : 0;
    this.pivot.updateMatrixWorld(true);
    const upright = new Box3().setFromObject(object);
    const middle = upright.getCenter(new Vector3());
    this.pivot.position.set(-middle.x, -upright.min.y, -middle.z);
    this.pivot.updateMatrixWorld(true);
    const placed = new Box3().setFromObject(object);
    placed.getCenter(this.center);
    this.radius = Math.max(placed.getSize(new Vector3()).length() / 2, 1e-6);

    this.applyWireframe();
    this.rebuildHelpers();
    this.setView('iso');
    return { triangles: countTriangles(object), bounds: { x: size.x, y: size.y, z: size.z } };
  }

  /** Removes the model and frees its resources. */
  clearModel() {
    this.clearMeasure();
    if (this.content) {
      this.pivot.remove(this.content);
      disposeObject(this.content, this.material);
      this.content = null;
    }
    this.requestRender();
  }

  setColors(colors: SceneColors) {
    this.colors = colors;
    this.scene.background = new Color(colors.background);
    this.material.color.set(colors.model);
    this.ground.groundColor.set(colors.groundLight);
    for (const child of this.measureGroup.children) {
      if (child instanceof Mesh || child instanceof Line) {
        (child.material as MeshBasicMaterial).color.set(colors.measure);
      }
    }
    this.rebuildHelpers();
    this.requestRender();
  }

  setHelpers(hasGrid: boolean, hasAxes: boolean) {
    this.hasGrid = hasGrid;
    this.hasAxes = hasAxes;
    this.rebuildHelpers();
  }

  setWireframe(isWireframe: boolean) {
    this.isWireframe = isWireframe;
    this.applyWireframe();
  }

  setTurntable(isSpinning: boolean) {
    this.controls.autoRotate = isSpinning;
    this.requestRender();
  }

  setMeasuring(isMeasuring: boolean) {
    this.isMeasuring = isMeasuring;
    if (!isMeasuring) {
      this.clearMeasure();
    }
  }

  clearMeasure() {
    this.points = [];
    this.rebuildMeasure();
  }

  /** Points the camera at the model from a preset direction, fitting it to the view. */
  setView(view: ModelView) {
    const direction = new Vector3(...viewDirections[view]).normalize();
    const distance = fitDistance(this.radius, FOV, this.camera.aspect);
    this.camera.position.copy(this.center).addScaledVector(direction, distance);
    this.camera.near = distance / 100;
    this.camera.far = distance * 100;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(this.center);
    this.controls.maxDistance = distance * 10;
    this.controls.update();
    this.requestRender();
  }

  /** Matches the drawing buffer to the container's size. */
  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.controls.removeEventListener('change', this.requestRender);
    this.controls.removeEventListener('start', this.handleStart);
    this.controls.dispose();
    this.clearModel();
    this.removeHelpers();
    disposeObject(this.measureGroup);
    this.material.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private readonly requestRender = () => {
    if (this.frame === 0) {
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  private readonly tick = () => {
    this.frame = 0;
    const hasChanged = this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (hasChanged || this.controls.autoRotate) {
      this.requestRender();
    }
  };

  private readonly handleStart = () => {
    if (this.controls.autoRotate) {
      this.controls.autoRotate = false;
      this.onInteract?.();
    }
  };

  private readonly handlePointerDown = (event: PointerEvent) => {
    this.pointerStart = event.isPrimary ? new Vector2(event.clientX, event.clientY) : null;
  };

  /** A tap or click (not a drag) while measuring places a point where it hits the model. */
  private readonly handlePointerUp = (event: PointerEvent) => {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (!this.isMeasuring || !this.content || !start) {
      return;
    }
    if (start.distanceTo(new Vector2(event.clientX, event.clientY)) > 6) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const pointer = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const [hit] = this.raycaster.intersectObject(this.content, true);
    if (!hit) {
      return;
    }
    this.points =
      this.points.length >= 2 ? [hit.point.clone()] : [...this.points, hit.point.clone()];
    this.rebuildMeasure();
  };

  private rebuildMeasure() {
    disposeObject(this.measureGroup);
    this.measureGroup.clear();
    for (const point of this.points) {
      const marker = new Mesh(
        new SphereGeometry(this.radius * 0.015, 16, 12),
        new MeshBasicMaterial({ color: this.colors.measure, depthTest: false }),
      );
      marker.position.copy(point);
      marker.renderOrder = 2;
      this.measureGroup.add(marker);
    }
    const [first, second] = this.points;
    if (first && second) {
      const line = new Line(
        new BufferGeometry().setFromPoints([first, second]),
        new LineBasicMaterial({ color: this.colors.measure, depthTest: false }),
      );
      line.renderOrder = 2;
      this.measureGroup.add(line);
    }
    // World units are model units: the model is only turned and moved, never scaled.
    this.onMeasure?.({
      points: this.points.length as 0 | 1 | 2,
      distance: first && second ? first.distanceTo(second) : null,
    });
    this.requestRender();
  }

  private applyWireframe() {
    this.material.wireframe = this.isWireframe;
    this.content?.traverse((child) => {
      const mesh = meshOf(child);
      if (mesh) {
        for (const material of materialsOf(mesh)) {
          if ('wireframe' in material) {
            material.wireframe = this.isWireframe;
          }
        }
      }
    });
    this.requestRender();
  }

  private removeHelpers() {
    if (this.grid) {
      this.scene.remove(this.grid);
      this.grid.dispose();
      this.grid = null;
    }
    if (this.axes) {
      this.pivot.remove(this.axes);
      this.axes.dispose();
      this.axes = null;
    }
  }

  /** The grid floor and the model's axes, sized to the model and coloured from the theme. */
  private rebuildHelpers() {
    this.removeHelpers();
    if (!this.content) {
      return;
    }
    const size = this.modelBox.getSize(new Vector3());
    const largest = Math.max(size.x, size.y, size.z, 1e-6);
    if (this.hasGrid) {
      const extent = niceCeil(largest * 2);
      this.grid = new GridHelper(
        extent,
        10,
        new Color(this.colors.gridCenter),
        new Color(this.colors.grid),
      );
      this.scene.add(this.grid);
    }
    if (this.hasAxes) {
      // In the model's own axes, from the corner of its bounding box.
      this.axes = new AxesHelper(largest * 0.6);
      this.axes.setColors(
        new Color(this.colors.axisX),
        new Color(this.colors.axisY),
        new Color(this.colors.axisZ),
      );
      this.axes.position.copy(this.modelBox.min);
      this.pivot.add(this.axes);
    }
    this.requestRender();
  }
}
