// Loads a model file with the matching three.js loader. Loaders are imported on demand, so an app showing STL files
// never downloads the glTF loader.
import { Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import type { ModelFormat } from './geometry';

export interface LoadedModel {
  object: Object3D;
  /** STL and OBJ (without materials) carry no colours, so the viewer gives them its themed material. */
  isUncoloured: boolean;
}

export type AnyMesh = Mesh<BufferGeometry, Material | Material[]>;

/** The object as a mesh, or `null` when it isn't one. */
export function meshOf(object: Object3D): AnyMesh | null {
  return object instanceof Mesh ? (object as AnyMesh) : null;
}

/** Called with the fraction downloaded, or `null` while the size is unknown. */
export type LoadProgress = (fraction: number | null) => void;

function progressHandler(onProgress: LoadProgress) {
  return (event: ProgressEvent) => {
    onProgress(event.lengthComputable && event.total > 0 ? event.loaded / event.total : null);
  };
}

/** Rejects when the format is unknown (`null`) or the file can't be fetched or parsed. */
export async function loadModel(
  src: string,
  format: ModelFormat | null,
  onProgress: LoadProgress,
): Promise<LoadedModel> {
  const handleProgress = progressHandler(onProgress);
  switch (format) {
    case null:
      throw new Error(`Unknown model format: ${src}`);
    case 'stl': {
      const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
      const geometry = await new STLLoader().loadAsync(src, handleProgress);
      return { object: new Mesh(geometry), isUncoloured: true };
    }
    case 'obj': {
      const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
      const group = await new OBJLoader().loadAsync(src, handleProgress);
      group.traverse((child) => {
        const mesh = meshOf(child);
        if (mesh && !mesh.geometry.hasAttribute('normal')) {
          mesh.geometry.computeVertexNormals();
        }
      });
      return { object: group, isUncoloured: true };
    }
    case 'glb':
    case 'gltf': {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(src, handleProgress);
      return { object: gltf.scene, isUncoloured: false };
    }
  }
}
