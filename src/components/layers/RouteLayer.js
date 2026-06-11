import { useState } from 'react';
import { Polyline, CircleMarker, Popup, LayerGroup, FeatureGroup, useMap, useMapEvents } from 'react-leaflet';
import { BASE_URL } from '@/data/routeData';
import PopupLightbox from './PopupLightbox';
import RouteFeedbackForm from '../forms/RouteFeedbackForm';
import StationPopupContent from './StationPopupContent';

function markerRadius(zoom) {
  if (zoom >= 17) return 9;
  if (zoom >= 15) return 7;
  if (zoom >= 13) return 5;
  return 3;
}

function ZoomAwareMarker({ station, route }) {
  const map = useMap();
  const [radius, setRadius] = useState(() => markerRadius(map.getZoom()));

  useMapEvents({
    zoomend: () => setRadius(markerRadius(map.getZoom())),
  });

  return (
    <CircleMarker
      center={[station.lat, station.lng]}
      radius={radius}
      pathOptions={{
        color: 'rgba(255,255,255,0.55)',
        weight: 1.5,
        fillColor: route.color,
        fillOpacity: 1,
      }}
    >
      <Popup maxWidth={420} minWidth={340} className="custom-popup">
        <PopupLightbox />
        <StationPopupContent station={station} routeColor={route.color} />
      </Popup>
    </CircleMarker>
  );
}

export default function RouteLayer({ route, polylines }) {
  return (
    <LayerGroup>
      {/* Polylines */}
      {Array.isArray(polylines[0])
        ? Array.isArray(polylines[0][0])
          ? polylines.map((seg, si) => (
            <FeatureGroup key={`${route.id}-seg-group-${si}`}>
              <Polyline
                positions={seg}
                pathOptions={{
                  color: route.color,
                  weight: 4,
                  opacity: 0.75,
                  dashArray: null,
                  interactive: false
                }}
              />
              <Polyline
                positions={seg}
                pathOptions={{
                  color: '#000000',
                  weight: 20,
                  opacity: 0.001,
                  interactive: true
                }}
              >
                <Popup className="feedback-popup" minWidth={300} maxWidth={400}>
                  <RouteFeedbackForm
                    routeId={route.id}
                    routeName={route.name || `路線 ${route.id}`}
                    segmentId={`seg_${si + 1}`}
                  />
                </Popup>
              </Polyline>
            </FeatureGroup>
          ))
          : (
            <FeatureGroup>
              <Polyline
                positions={polylines}
                pathOptions={{
                  color: route.color,
                  weight: 4,
                  opacity: 0.75,
                  interactive: false
                }}
              />
              <Polyline
                positions={polylines}
                pathOptions={{
                  color: '#000000',
                  weight: 20,
                  opacity: 0.001,
                  interactive: true
                }}
              >
                <Popup className="feedback-popup" minWidth={300} maxWidth={400}>
                  <RouteFeedbackForm
                    routeId={route.id}
                    routeName={route.name || `路線 ${route.id}`}
                    segmentId={`seg_1`}
                  />
                </Popup>
              </Polyline>
            </FeatureGroup>
          )
        : null}

      {/* Station markers — zoom-aware size, soft earth-tone border */}
      {route.stations.map((station) => (
        <ZoomAwareMarker
          key={`${route.id}-${station.id}`}
          station={station}
          route={route}
        />
      ))}
    </LayerGroup>
  );
}
