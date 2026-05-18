import { Polyline, CircleMarker, Popup, LayerGroup, FeatureGroup } from 'react-leaflet';
import { BASE_URL } from '@/data/routeData';
import PopupLightbox from './PopupLightbox';
import RouteFeedbackForm from '../forms/RouteFeedbackForm';

export default function RouteLayer({ route, polylines }) {
  return (
    <LayerGroup>
      {/* Polylines */}
      {Array.isArray(polylines[0])
        ? Array.isArray(polylines[0][0])
          ? polylines.map((seg, si) => (
            <FeatureGroup key={`${route.id}-seg-group-${si}`}>
              {/* Visible Polyline */}
              <Polyline
                positions={seg}
                pathOptions={{
                  color: route.color,
                  weight: 4,
                  opacity: 0.75,
                  dashArray: null,
                  interactive: false // Let the invisible line handle clicks
                }}
              />
              {/* Invisible Hit Area */}
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

      {/* Station markers */}
      {route.stations.map((station) => (
        <CircleMarker
          key={`${route.id}-${station.id}`}
          center={[station.lat, station.lng]}
          radius={8}
          pathOptions={{
            color: '#fff',
            weight: 2,
            fillColor: route.color,
            fillOpacity: 1,
          }}
        >
          <Popup
            maxWidth={420}
            minWidth={340}
            className="custom-popup"
          >
            <PopupLightbox />
            <div className="popup-content">
              <div
                className="popup-badge"
                style={{ background: route.color }}
              >
                {station.badge || station.id}
              </div>
              <h3 className="popup-title">{station.name}</h3>
              <p className="popup-hook">{station.hook}</p>
              {station.body && (
                <p className="popup-body">{station.body}</p>
              )}
              {station.imgs && station.imgs.length > 0 && (
                <div className="popup-images">
                  {station.imgs.map((img, i) => (
                    <figure key={i} className="popup-figure">
                      <img
                        src={`${BASE_URL}${img.src}`}
                        alt={img.cap || station.name}
                        loading="lazy"
                        className="popup-img cursor-pointer hover:opacity-90 transition-opacity"
                      />
                      {img.cap && (
                        <figcaption className="popup-caption">
                          {img.cap}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </LayerGroup>
  );
}
