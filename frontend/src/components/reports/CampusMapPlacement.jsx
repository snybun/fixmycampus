import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Building2,
  X,
} from 'lucide-react';

/**
 * Campus Building definitions mapped to the authentic PHINMA University of Pangasinan Route Map.
 * Coordinates are in percentage (0 - 100%) matching the 880x631 route map canvas.
 */
export const ROUTE_MAP_BUILDINGS = [
  {
    id: 'ptc',
    name: 'PTC Building',
    code: 'PTC',
    match: ['ptc', 'ptc building'],
    pin: { x: 7.7, y: 40.4 },
    hotspot: { left: 2.8, top: 32.5, width: 10.5, height: 28.5 },
    label: 'PTC Building',
    desc: 'Polytechnic & Technology Classrooms',
    category: 'Engineering & Tech',
  },
  {
    id: 'cma',
    name: 'CMA Building',
    code: 'CMA',
    match: ['cma', 'cma building', 'cma hallway'],
    pin: { x: 32.1, y: 71.3 },
    hotspot: { left: 23.5, top: 56.0, width: 19.0, height: 28.0 },
    label: 'CMA Building',
    desc: 'Management & Accountancy, Enrollment Atrium',
    category: 'Business & Finance',
  },
  {
    id: 'nh',
    name: 'NH Building',
    code: 'NH',
    match: ['nh', 'nh building', 'north hall'],
    pin: { x: 55.4, y: 89.9 },
    hotspot: { left: 45.0, top: 85.0, width: 23.0, height: 9.5 },
    label: 'North Hall (NH)',
    desc: 'Main Lecture Theaters & Academic Rooms',
    category: 'General Academics',
  },
  {
    id: 'mba',
    name: 'MBA Building',
    code: 'MBA',
    match: ['mba', 'mba building', 'mba hall', 'mba engineering'],
    pin: { x: 75.6, y: 35.3 },
    hotspot: { left: 70.0, top: 8.0, width: 15.0, height: 52.0 },
    label: 'MBA Building',
    desc: 'Engineering Labs, Classrooms & MBA Hall',
    category: 'Engineering & Grad',
  },
  {
    id: 'rs',
    name: 'RS Building',
    code: 'RS',
    match: ['rs', 'rs building', 'riverside', 'riverside building'],
    pin: { x: 93.2, y: 13.5 },
    hotspot: { left: 81.5, top: 3.0, width: 18.0, height: 16.0 },
    label: 'RS Building (Riverside)',
    desc: 'Riverside Academic Complex & Facilities',
    category: 'Specialized Labs',
  },
  {
    id: 'be',
    name: 'BE Building',
    code: 'BE',
    match: ['be', 'be building', 'basic ed', 'basic education'],
    pin: { x: 30.1, y: 25.4 },
    hotspot: { left: 24.5, top: 17.5, width: 12.0, height: 13.0 },
    label: 'BE Building (Basic Ed)',
    desc: 'Basic Education & Module Distribution',
    category: 'Basic Education',
  },
  {
    id: 'gym',
    name: 'GYM',
    code: 'GYM',
    match: ['gym', 'gymnasium', 'sports'],
    pin: { x: 58.4, y: 18.5 },
    hotspot: { left: 46.5, top: 6.0, width: 28.0, height: 26.5 },
    label: 'Campus Gymnasium',
    desc: 'Sports Arena, Indoor Courts & PE Facilities',
    category: 'Athletics & Events',
  },
  {
    id: 'plaza',
    name: 'SP (Student Plaza)',
    code: 'SP',
    match: ['sp', 'student plaza', 'plaza', 'sp (student plaza)'],
    pin: { x: 56.8, y: 49.9 },
    hotspot: { left: 44.5, top: 41.5, width: 26.5, height: 16.0 },
    label: 'Student Plaza (SP)',
    desc: 'Student Pavilion & Community Activity Plaza',
    category: 'Student Hub',
  },
  {
    id: 'lib',
    name: 'Library',
    code: 'LIB',
    match: ['library', 'lib', 'fvr', 'main library'],
    pin: { x: 25.5, y: 43.5 },
    hotspot: { left: 21.5, top: 38.0, width: 8.0, height: 10.0 },
    label: 'Library (FVR)',
    desc: 'FVR Building, Near Business Center',
    category: 'Study & Research',
  },
  {
    id: 'chs',
    name: 'CCJE Building',
    code: 'CCJE',
    match: ['ccje', 'ccje building', 'chs', 'health sciences'],
    pin: { x: 40.9, y: 25.4 },
    hotspot: { left: 37.0, top: 18.0, width: 8.5, height: 13.0 },
    label: 'CCJE / CHS Building',
    desc: 'Criminology & Health Sciences Complex',
    category: 'Allied Sciences',
  },
];

export default function CampusMapPlacement({
  selectedBuilding,
  onSelectBuilding,
  buildings = [],
  roomCoordinate = '',
  onCoordinateChange,
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [customPin, setCustomPin] = useState(null);
  const mapContainerRef = useRef(null);
  const modalMapContainerRef = useRef(null);

  // Check if "Others" is selected
  const isOthers = selectedBuilding?.toLowerCase().trim() === 'others';

  // Helper to match active building object
  const findBuildingConfig = (name) => {
    if (!name || name.toLowerCase().trim() === 'others') return null;
    const lower = name.toLowerCase().trim();
    return (
      ROUTE_MAP_BUILDINGS.find((b) =>
        b.match.some((m) => lower === m || lower.includes(m))
      ) || null
    );
  };

  const activeConfig = findBuildingConfig(selectedBuilding);

  // When "Others" is pressed, the pin point disappears completely!
  const activePinCoords = isOthers
    ? null
    : (customPin || (activeConfig ? activeConfig.pin : null));

  // Reset custom pin when building changes
  useEffect(() => {
    setCustomPin(null);
  }, [selectedBuilding]);

  // Handle click on map canvas
  const handleMapClick = (e, containerRef) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicked inside any building hotspot
    const hit = ROUTE_MAP_BUILDINGS.find((b) => {
      const h = b.hotspot;
      return (
        clickX >= h.left &&
        clickX <= h.left + h.width &&
        clickY >= h.top &&
        clickY <= h.top + h.height
      );
    });

    if (hit) {
      // Find the matching name from the actual buildings list passed in props
      const dbMatch = (buildings || []).find((b) =>
        hit.match.some((m) => b.name.toLowerCase().includes(m))
      );
      const targetName = dbMatch ? dbMatch.name : hit.name;

      onSelectBuilding(targetName);
      setCustomPin({ x: parseFloat(clickX.toFixed(1)), y: parseFloat(clickY.toFixed(1)) });
    } else {
      // If clicked on open area (e.g. garden or courtyard), place custom pin only if not in 'Others'
      if (!isOthers) {
        setCustomPin({ x: parseFloat(clickX.toFixed(1)), y: parseFloat(clickY.toFixed(1)) });
      }
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(2.0, +(prev + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(1.0, +(prev - 0.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setCustomPin(null);
  };

  return (
    <div className="cmp-wrapper">
      {/* Top Header Card */}
      <div className="cmp-header">
        <div className="cmp-header-left">
          <div className={`cmp-badge-pulse ${isOthers ? 'is-disabled' : ''}`} />
          <div>
            <div className="cmp-title">PHINMA University of Pangasinan</div>
            <div className="cmp-subtitle">Interactive Campus Route Map</div>
          </div>
        </div>

        <div className="cmp-controls">
          <button
            type="button"
            className="cmp-btn-tool"
            onClick={handleZoomIn}
            title="Zoom In"
            disabled={zoomLevel >= 2.0}
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            className="cmp-btn-tool"
            onClick={handleZoomOut}
            title="Zoom Out"
            disabled={zoomLevel <= 1.0}
          >
            <ZoomOut size={15} />
          </button>
          {zoomLevel > 1 && (
            <button
              type="button"
              className="cmp-btn-tool"
              onClick={handleResetZoom}
              title="Reset Zoom"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            type="button"
            className="cmp-btn-tool cmp-btn-expand"
            onClick={() => setIsFullscreen(true)}
            title="Expand Full Map View"
          >
            <Maximize2 size={15} />
            <span>Full Map</span>
          </button>
        </div>
      </div>

      {/* Map Viewport */}
      <div
        className={`cmp-viewport ${zoomLevel > 1 ? 'is-zoomed' : ''}`}
        ref={mapContainerRef}
        onClick={(e) => handleMapClick(e, mapContainerRef)}
      >
        <div
          className="cmp-canvas"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Authentic Campus Route Map Image */}
          <img
            src="/images/campus_route_map.jpg"
            alt="PHINMA University of Pangasinan Route Map"
            className="cmp-map-img"
            draggable={false}
          />

          {/* Interactive Hotspot Zones */}
          {ROUTE_MAP_BUILDINGS.map((b) => {
            const isSelected = !isOthers && activeConfig?.id === b.id;
            const isHovered = hoveredBuilding?.id === b.id;
            return (
              <div
                key={b.id}
                className={`cmp-hotspot ${isSelected ? 'is-selected' : ''} ${
                  isHovered ? 'is-hovered' : ''
                }`}
                style={{
                  left: `${b.hotspot.left}%`,
                  top: `${b.hotspot.top}%`,
                  width: `${b.hotspot.width}%`,
                  height: `${b.hotspot.height}%`,
                }}
                onMouseEnter={() => setHoveredBuilding(b)}
                onMouseLeave={() => setHoveredBuilding(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  const dbMatch = (buildings || []).find((item) =>
                    b.match.some((m) => item.name.toLowerCase().includes(m))
                  );
                  onSelectBuilding(dbMatch ? dbMatch.name : b.name);
                  setCustomPin(b.pin);
                }}
                title={`${b.label}: Click to place location`}
              >
                {/* Floating Building Label Badge */}
                <div className={`cmp-hotspot-label ${isSelected || isHovered ? 'is-visible' : ''}`}>
                  <span>{b.code || b.name}</span>
                </div>
              </div>
            );
          })}

          {/* Active Pinpoint Marker (Disappears completely when 'Others' is selected) */}
          {activePinCoords && !isOthers && (
            <div
              className="cmp-pin-marker"
              style={{
                left: `${activePinCoords.x}%`,
                top: `${activePinCoords.y}%`,
              }}
            >
              <div className="cmp-pin-pulse" />
              <div className="cmp-pin-icon-wrap">
                <MapPin size={22} className="cmp-pin-icon" />
              </div>
              <div className="cmp-pin-callout">
                <span className="cmp-pin-title">
                  {activeConfig?.label || selectedBuilding}
                </span>
                <span className="cmp-pin-sub">
                  {customPin
                    ? `Pinned (${customPin.x}%, ${customPin.y}%)`
                    : 'Designated Placement'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Interactive Lightbox Modal */}
      {isFullscreen && (
        <div className="cmp-modal-overlay" onClick={() => setIsFullscreen(false)}>
          <div className="cmp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cmp-modal-header">
              <div className="cmp-modal-title-group">
                <Building2 className="cmp-modal-icon" size={22} />
                <div>
                  <h3 className="cmp-modal-title">PHINMA University of Pangasinan Campus Map</h3>
                  <p className="cmp-modal-desc">
                    Click any building or location to pinpoint defect coordinates.
                  </p>
                </div>
              </div>
              <div className="cmp-modal-header-actions">
                <div className="cmp-controls">
                  <button
                    type="button"
                    className="cmp-btn-tool"
                    onClick={handleZoomIn}
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    type="button"
                    className="cmp-btn-tool"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button
                    type="button"
                    className="cmp-btn-tool"
                    onClick={handleResetZoom}
                    title="Reset"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  className="cmp-modal-close"
                  onClick={() => setIsFullscreen(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Map Viewport: locked to exact 880x631 aspect-ratio frame so hotspots are 100% aligned */}
            <div className="cmp-modal-map-viewport">
              <div
                className="cmp-modal-canvas-frame"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
              >
                <div
                  className="cmp-modal-canvas"
                  ref={modalMapContainerRef}
                  onClick={(e) => handleMapClick(e, modalMapContainerRef)}
                >
                  <img
                    src="/images/campus_route_map.jpg"
                    alt="High Resolution Route Map"
                    className="cmp-modal-map-img"
                    draggable={false}
                  />

                  {ROUTE_MAP_BUILDINGS.map((b) => {
                    const isSelected = !isOthers && activeConfig?.id === b.id;
                    const isHovered = hoveredBuilding?.id === b.id;
                    return (
                      <div
                        key={b.id}
                        className={`cmp-hotspot ${isSelected ? 'is-selected' : ''} ${
                          isHovered ? 'is-hovered' : ''
                        }`}
                        style={{
                          left: `${b.hotspot.left}%`,
                          top: `${b.hotspot.top}%`,
                          width: `${b.hotspot.width}%`,
                          height: `${b.hotspot.height}%`,
                        }}
                        onMouseEnter={() => setHoveredBuilding(b)}
                        onMouseLeave={() => setHoveredBuilding(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          const dbMatch = (buildings || []).find((item) =>
                            b.match.some((m) => item.name.toLowerCase().includes(m))
                          );
                          onSelectBuilding(dbMatch ? dbMatch.name : b.name);
                          setCustomPin(b.pin);
                        }}
                        title={b.label}
                      >
                        <div className={`cmp-hotspot-label modal-label ${isSelected || isHovered ? 'is-visible' : ''}`}>
                          <span>{b.label}</span>
                        </div>
                      </div>
                    );
                  })}

                  {activePinCoords && !isOthers && (
                    <div
                      className="cmp-pin-marker"
                      style={{
                        left: `${activePinCoords.x}%`,
                        top: `${activePinCoords.y}%`,
                      }}
                    >
                      <div className="cmp-pin-pulse" />
                      <div className="cmp-pin-icon-wrap">
                        <MapPin size={26} className="cmp-pin-icon" />
                      </div>
                      <div className="cmp-pin-callout">
                        <span className="cmp-pin-title">
                          {activeConfig?.label || selectedBuilding}
                        </span>
                        <span className="cmp-pin-sub">
                          {activeConfig?.desc || 'Defect Coordinate'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="cmp-modal-footer">
              <div className="cmp-modal-info">
                <span className="cmp-modal-selected-label">Selected Building:</span>
                <span className="cmp-modal-selected-val">
                  {isOthers ? 'Others (Unpinned)' : selectedBuilding}
                </span>
                {activeConfig && !isOthers && (
                  <span className="cmp-modal-selected-desc">— {activeConfig.desc}</span>
                )}
              </div>
              <button
                type="button"
                className="cmp-modal-done-btn"
                onClick={() => setIsFullscreen(false)}
              >
                Apply Placement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
