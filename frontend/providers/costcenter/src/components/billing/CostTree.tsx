import React from 'react';
import { TransformComponent, TransformWrapper, useTransformContext } from 'react-zoom-pan-pinch';
import { useMemo, useState } from 'react';
import { getSmoothStepPath } from '@/utils/smooth-step-path';
import { formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';

const GRID_SIZE = '2.5rem';

const CanvasNode = React.forwardRef<
  HTMLDivElement,
  {
    anchorX: number;
    anchorY: number;
    children: React.ReactNode;
  }
>(({ anchorX = 0, anchorY = 0, children }, ref) => (
  <div
    className="absolute"
    style={{
      transform: `translate(calc(${anchorX} * ${GRID_SIZE}), calc(${anchorY} * ${GRID_SIZE}))`
    }}
    ref={ref}
  >
    {children}
  </div>
));
CanvasNode.displayName = 'CanvasNode';

export type BillingNode = {
  id: string;
  name: string;
  cost: number;
  type: 'total' | 'region' | 'workspace';
  dependsOn: string | null;
};

function CostCard({
  id,
  name,
  cost,
  selected,
  onClick
}: {
  selected: boolean;
  onClick: (nodeId: string) => void;
} & Pick<BillingNode, 'id' | 'name' | 'cost'>) {
  return (
    <button
      className="bg-white flex flex-col gap-1 justify-start items-start p-3 w-40 rounded-xl border shadow-sm border-dashed hover:border-blue-600 border-gray-400 data-[selected=true]:border-2 data-[selected=true]:border-blue-600 data-[selected=true]:border-solid"
      onClick={() => onClick(id)}
      data-selected={selected}
    >
      <h3 className="text-gray-600 text-sm text-nowrap truncate w-full text-start" title={name}>
        {name}
      </h3>
      <span
        className="text-gray-900 font-bold data-[selected=true]:text-blue-600"
        data-selected={selected}
      >
        <CurrencySymbol />
        <span>{formatMoney(cost).toFixed(2)}</span>
      </span>
    </button>
  );
}

function CostNodesCanvas({
  nodes,
  selectedRegion: externalSelectedRegion,
  selectedWorkspace: externalSelectedWorkspace,
  onRegionSelect,
  onWorkspaceSelect
}: {
  nodes: BillingNode[];
  selectedRegion?: string | null;
  selectedWorkspace?: string | null;
  onRegionSelect?: (regionId: string | null) => void;
  onWorkspaceSelect?: (workspaceId: string | null) => void;
}) {
  const transformContext = useTransformContext();

  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const [nodeElements, setNodeElements] = useState<Map<string, HTMLElement>>(new Map());
  // Avoid infinite loops when rendering nodes
  const nodeRefCallbackMap = React.useRef(new Map<string, (el: HTMLElement | null) => void>());
  const getRefForNode = React.useCallback((id: string) => {
    let cb = nodeRefCallbackMap.current.get(id);
    if (!cb) {
      cb = (el: HTMLElement | null) => {
        setNodeElements((prev) => {
          const current = prev.get(id) ?? null;
          if (current === el) return prev;

          const next = new Map(prev);
          if (el) next.set(id, el);
          else next.delete(id);
          return next;
        });
      };
      nodeRefCallbackMap.current.set(id, cb);
    }
    return cb;
  }, []);

  const [internalSelectedRegion, setInternalSelectedRegion] = useState<string | null>(null);
  const [internalSelectedWorkspace, setInternalSelectedWorkspace] = useState<string | null>(null);

  const selectedRegion =
    externalSelectedRegion !== undefined ? externalSelectedRegion : internalSelectedRegion;
  const selectedWorkspace =
    externalSelectedWorkspace !== undefined ? externalSelectedWorkspace : internalSelectedWorkspace;

  const handleRegionSelect = (regionId: string | null) => {
    if (onRegionSelect) {
      onRegionSelect(regionId);
      // Always clear workspace selection when region changes
      if (onWorkspaceSelect) {
        onWorkspaceSelect(null);
      }
    } else {
      setInternalSelectedRegion(regionId);
      setInternalSelectedWorkspace(null);
    }
  };

  const handleWorkspaceSelect = (workspaceId: string | null) => {
    if (onWorkspaceSelect) {
      onWorkspaceSelect(workspaceId);
    } else {
      setInternalSelectedWorkspace(workspaceId);
    }
  };

  const rootNode = useMemo(() => nodes.find((item) => item.type === 'total'), [nodes]);
  const regionNodes = useMemo(() => nodes.filter((item) => item.type === 'region'), [nodes]);
  const workspaceNodes = useMemo(
    () =>
      nodes.filter(
        (item) => item.type === 'workspace' && selectedRegion && item.dependsOn === selectedRegion
      ),
    [nodes, selectedRegion]
  );

  const paths = useMemo(() => {
    type PathItem = {
      id: string;
      d: string;
      highlighted: boolean;
    };

    const regularPaths: PathItem[] = [];
    const highlightedPaths: PathItem[] = [];

    if (!rootNode)
      return {
        regularPaths,
        highlightedPaths
      };

    const visibleNodes: BillingNode[] = [rootNode, ...regionNodes, ...workspaceNodes];

    for (const node of visibleNodes) {
      if (!wrapperRef.current) break;
      if (!node.dependsOn) continue;

      const fromElement = nodeElements.get(node.dependsOn);
      const fromNode = nodes.find((item) => item.id === node.dependsOn);
      const toElement = nodeElements.get(node.id);
      if (!fromElement || !fromNode || !toElement) continue;

      const fromDirection = fromNode.type === 'total' ? 'bottom' : 'right';

      const wrapperRect = wrapperRef.current.getBoundingClientRect();

      const fromRect = fromElement.getBoundingClientRect();
      const fromX =
        (fromDirection === 'bottom' ? fromRect.left + fromRect.width / 2 : fromRect.right) -
        wrapperRect.left;
      const fromY =
        (fromDirection === 'bottom' ? fromRect.bottom : fromRect.top + fromRect.height / 2) -
        wrapperRect.top;

      const toRect = toElement.getBoundingClientRect();
      const toX = toRect.left - wrapperRect.left;
      const toY = toRect.top + toRect.height / 2 - wrapperRect.top;

      // coords in SVG should not be scaled
      const path = getSmoothStepPath({
        sourceX: fromX / transformContext.transformState.scale,
        sourceY: fromY / transformContext.transformState.scale,
        sourcePosition: fromDirection,
        targetX: toX / transformContext.transformState.scale,
        targetY: toY / transformContext.transformState.scale,
        targetPosition: 'left',
        borderRadius: 12
      })[0];

      if (selectedRegion === node.id || selectedWorkspace === node.id)
        highlightedPaths.push({
          id: node.id,
          d: path,
          highlighted: true
        });
      else
        regularPaths.push({
          id: node.id,
          d: path,
          highlighted: false
        });
    }

    return {
      regularPaths,
      highlightedPaths
    };
  }, [
    nodeElements,
    nodes,
    workspaceNodes,
    regionNodes,
    rootNode,
    selectedRegion,
    selectedWorkspace,
    transformContext.transformState.scale
  ]);

  return (
    <div className="relative w-px h-px" ref={wrapperRef}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        className="absolute w-full h-full -z-10 overflow-visible"
      >
        <g>
          {paths.regularPaths.map((path) => (
            <path
              key={path.id}
              stroke="var(--color-zinc-400)"
              strokeWidth="1"
              strokeDasharray="2 2"
              d={path.d}
            />
          ))}
        </g>
        <g>
          {paths.highlightedPaths.map((path) => (
            <path key={path.id} stroke="var(--color-blue-600)" strokeWidth="2" d={path.d} />
          ))}
        </g>
      </svg>

      {rootNode && (
        <CanvasNode anchorX={0} anchorY={0} ref={getRefForNode('total_cost')}>
          <CostCard
            id={rootNode.id}
            name={rootNode.name}
            cost={rootNode.cost}
            onClick={() => {
              handleRegionSelect(null);
              // handleWorkspaceSelect(null) is called automatically in handleRegionSelect
            }}
            selected={false}
          />
        </CanvasNode>
      )}
      {regionNodes.map((node, idx) => (
        <CanvasNode key={node.id} anchorX={3} anchorY={3 + idx * 2.5} ref={getRefForNode(node.id)}>
          <CostCard
            id={node.id}
            name={node.name}
            cost={node.cost}
            onClick={(id) => {
              handleRegionSelect(id);
              // handleWorkspaceSelect(null) is called automatically in handleRegionSelect
            }}
            selected={selectedRegion === node.id}
          />
        </CanvasNode>
      ))}
      {workspaceNodes.map((node, idx) => (
        <CanvasNode
          key={node.id}
          anchorX={9.5}
          anchorY={4.5 + idx * 2.5}
          ref={getRefForNode(node.id)}
        >
          <CostCard
            id={node.id}
            name={node.name}
            cost={node.cost}
            onClick={(id) => handleWorkspaceSelect(id)}
            selected={selectedWorkspace === node.id}
          />
        </CanvasNode>
      ))}
    </div>
  );
}

type CostTreeProps = {
  children?: React.ReactNode;
  nodes: BillingNode[];
  selectedRegion?: string | null;
  selectedWorkspace?: string | null;
  onRegionSelect?: (regionId: string | null) => void;
  onWorkspaceSelect?: (workspaceId: string | null) => void;
};

export function CostTree({
  children,
  nodes,
  selectedRegion: externalSelectedRegion,
  selectedWorkspace: externalSelectedWorkspace,
  onRegionSelect,
  onWorkspaceSelect
}: CostTreeProps) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto overflow-hidden relative h-full w-full">
      <TransformWrapper
        minScale={0.75}
        maxScale={1.5}
        // These values are ignored, see:
        // https://github.com/BetterTyped/react-zoom-pan-pinch/issues/478
        minPositionX={-600}
        maxPositionX={600}
        minPositionY={-600}
        maxPositionY={600}
        centerOnInit={false}
        limitToBounds={false}
        initialPositionX={32}
        initialPositionY={56}
        doubleClick={{
          mode: 'toggle'
        }}
        wheel={{
          smoothStep: 0.008
        }}
        panning={{
          wheelPanning: true
        }}
      >
        <span className="absolute z-20 text-sm pointer-events-none top-5 left-5 text-zinc-600 backdrop-blur-md px-2 py-1 rounded-full">
          {t('common:cost_tree_tip')}
        </span>
        <div className="absolute top-0 right-0 z-20 overflow-y-auto p-0 w-[clamp(22.5rem,50%,36.5rem)] h-full overflow-scroll pointer-events-none">
          <div className="pointer-events-auto">{children}</div>
        </div>
        <svg className="absolute z-10 bg-zinc-50 flex-1 w-full h-full">
          <pattern
            id="pattern-circles"
            x="0"
            y="0"
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
            patternContentUnits="userSpaceOnUse"
          >
            <circle id="pattern-circle" cx="1rem" cy="1rem" r="0.75" fill="var(--color-zinc-600)" />
          </pattern>

          <rect id="rect" x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)" />
        </svg>
        <TransformComponent
          wrapperStyle={{
            width: '100%',
            height: '100%',
            zIndex: 10
          }}
        >
          <CostNodesCanvas
            nodes={nodes}
            selectedRegion={externalSelectedRegion}
            selectedWorkspace={externalSelectedWorkspace}
            onRegionSelect={onRegionSelect}
            onWorkspaceSelect={onWorkspaceSelect}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
