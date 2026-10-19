// The viewer's toolbar: the pointer tools as a single-choice group, the window presets, and view toggles. In a
// narrow viewer (phones) the tools and toggles collapse into menus so the bar fits one row.

import {
  Captions,
  Circle,
  Contrast,
  DraftingCompass,
  Hand,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Ruler,
  Square,
  SunMoon,
  ZoomIn,
} from 'lucide-react';
import {
  Toolbar as AriaToolbar,
  ToggleButtonGroup,
  type Key,
  type Selection,
} from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { Menu, MenuItem, MenuSection, MenuTrigger } from '../components/Menu/Menu';
import { MenuButton, OverflowMenu } from '../components/Menu/MenuButtons';
import { Tooltip } from '../components/Tooltip/Tooltip';
import type { IconComponent } from '../utils/icon';
import type { DicomStrings } from './messages';

/** A pointer tool: what dragging (or tapping) the image does. */
export type DicomTool =
  'scroll' | 'windowLevel' | 'pan' | 'zoom' | 'length' | 'angle' | 'roi' | 'rectangleRoi';

export const toolIcons: Record<DicomTool, IconComponent> = {
  scroll: Layers,
  windowLevel: Contrast,
  pan: Hand,
  zoom: ZoomIn,
  length: Ruler,
  angle: DraftingCompass,
  roi: Circle,
  rectangleRoi: Square,
};

export function toolLabel(tool: DicomTool, messages: DicomStrings): string {
  const labels: Record<DicomTool, string> = {
    scroll: messages.dicomToolScroll,
    windowLevel: messages.dicomToolWindowLevel,
    pan: messages.dicomToolPan,
    zoom: messages.dicomToolZoom,
    length: messages.dicomToolLength,
    angle: messages.dicomToolAngle,
    roi: messages.dicomToolRoi,
    rectangleRoi: messages.dicomToolRectangleRoi,
  };
  return labels[tool];
}

export interface DicomToolbarProps {
  messages: DicomStrings;
  tools: readonly DicomTool[];
  tool: DicomTool;
  onToolChange: (tool: DicomTool) => void;
  /** The presets to offer, already labelled; `default` returns to the image's own window. */
  presets: readonly { id: string; label: string }[];
  onPreset: (id: string) => void;
  isInverted: boolean;
  onInvertedChange: (isInverted: boolean) => void;
  onResetView: () => void;
  isOverlayShown: boolean;
  onOverlayShownChange: (isShown: boolean) => void;
  hasFullScreen: boolean;
  isFullScreen: boolean;
  onFullScreenToggle: () => void;
  /** Collapses tools and toggles into menus. */
  isCompact: boolean;
}

function firstKey(keys: Selection): Key | undefined {
  return keys === 'all' ? undefined : keys.values().next().value;
}

export function DicomToolbar({
  messages,
  tools,
  tool,
  onToolChange,
  presets,
  onPreset,
  isInverted,
  onInvertedChange,
  onResetView,
  isOverlayShown,
  onOverlayShownChange,
  hasFullScreen,
  isFullScreen,
  onFullScreenToggle,
  isCompact,
}: DicomToolbarProps) {
  const fullScreenLabel = isFullScreen ? messages.dicomExitFullScreen : messages.dicomFullScreen;
  const chooseTool = (keys: Selection) => {
    const key = firstKey(keys);
    const chosen = tools.find((candidate) => candidate === key);
    if (chosen) {
      onToolChange(chosen);
    }
  };
  const presetMenu = presets.length > 0 && (
    <MenuButton
      label={messages.dicomPresets}
      icon={SunMoon}
      variant="ghost"
      size="sm"
      onAction={(key) => {
        onPreset(String(key));
      }}
    >
      {presets.map((preset) => (
        <MenuItem key={preset.id} id={preset.id}>
          {preset.label}
        </MenuItem>
      ))}
    </MenuButton>
  );

  if (isCompact) {
    const ToolIcon = toolIcons[tool];
    return (
      <AriaToolbar aria-label={messages.dicomToolbar} className="flex flex-wrap items-center gap-1">
        {tools.length > 1 && (
          <MenuTrigger>
            <Button variant="ghost" size="sm" icon={ToolIcon}>
              {messages.dicomCurrentTool({ tool: toolLabel(tool, messages) })}
            </Button>
            <Menu aria-label={messages.dicomTool}>
              <MenuSection
                aria-label={messages.dicomTool}
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={[tool]}
                onSelectionChange={chooseTool}
              >
                {tools.map((candidate) => (
                  <MenuItem key={candidate} id={candidate} icon={toolIcons[candidate]}>
                    {toolLabel(candidate, messages)}
                  </MenuItem>
                ))}
              </MenuSection>
            </Menu>
          </MenuTrigger>
        )}
        {presetMenu}
        <OverflowMenu
          size="sm"
          className="ms-auto"
          onAction={(key) => {
            // Invert and overlays are checkbox items, handled by their section's selection.
            if (key === 'reset') {
              onResetView();
            } else if (key === 'fullScreen') {
              onFullScreenToggle();
            }
          }}
        >
          <MenuSection
            aria-label={messages.dicomOverlays}
            selectionMode="multiple"
            selectedKeys={[
              ...(isInverted ? ['invert'] : []),
              ...(isOverlayShown ? ['overlays'] : []),
            ]}
            onSelectionChange={(keys) => {
              if (keys === 'all') {
                return;
              }
              if (keys.has('invert') !== isInverted) {
                onInvertedChange(keys.has('invert'));
              }
              if (keys.has('overlays') !== isOverlayShown) {
                onOverlayShownChange(keys.has('overlays'));
              }
            }}
          >
            <MenuItem id="invert" icon={SunMoon}>
              {messages.dicomInvert}
            </MenuItem>
            <MenuItem id="overlays" icon={Captions}>
              {messages.dicomOverlays}
            </MenuItem>
          </MenuSection>
          <MenuSection aria-label={messages.dicomResetView}>
            <MenuItem id="reset" icon={RotateCcw}>
              {messages.dicomResetView}
            </MenuItem>
            {hasFullScreen ? (
              <MenuItem id="fullScreen" icon={isFullScreen ? Minimize2 : Maximize2}>
                {fullScreenLabel}
              </MenuItem>
            ) : null}
          </MenuSection>
        </OverflowMenu>
      </AriaToolbar>
    );
  }

  return (
    <AriaToolbar aria-label={messages.dicomToolbar} className="flex flex-wrap items-center gap-1">
      {tools.length > 1 && (
        <ToggleButtonGroup
          aria-label={messages.dicomTool}
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[tool]}
          onSelectionChange={chooseTool}
          className="flex flex-wrap items-center gap-0.5"
        >
          {tools.map((candidate) => (
            <Tooltip key={candidate} content={toolLabel(candidate, messages)}>
              <IconButton
                id={candidate}
                icon={toolIcons[candidate]}
                aria-label={toolLabel(candidate, messages)}
                size="sm"
                isSelected={candidate === tool}
              />
            </Tooltip>
          ))}
        </ToggleButtonGroup>
      )}
      <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
      {presetMenu}
      <Tooltip content={messages.dicomInvert}>
        <IconButton
          icon={SunMoon}
          aria-label={messages.dicomInvert}
          size="sm"
          isSelected={isInverted}
          onChange={onInvertedChange}
        />
      </Tooltip>
      <Tooltip content={messages.dicomOverlays}>
        <IconButton
          icon={Captions}
          aria-label={messages.dicomOverlays}
          size="sm"
          isSelected={isOverlayShown}
          onChange={onOverlayShownChange}
        />
      </Tooltip>
      <Tooltip content={messages.dicomResetView}>
        <IconButton
          icon={RotateCcw}
          aria-label={messages.dicomResetView}
          size="sm"
          onPress={onResetView}
        />
      </Tooltip>
      {hasFullScreen && (
        <Tooltip content={fullScreenLabel}>
          <IconButton
            icon={isFullScreen ? Minimize2 : Maximize2}
            aria-label={fullScreenLabel}
            size="sm"
            className="ms-auto"
            onPress={onFullScreenToggle}
          />
        </Tooltip>
      )}
    </AriaToolbar>
  );
}
