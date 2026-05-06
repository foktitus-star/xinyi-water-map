import { Polyline, CircleMarker, Popup, LayerGroup } from 'react-leaflet';
import { useEffect } from 'react';
import { BASE_URL } from '@/data/routeData';

function PopupLightbox() {
  useEffect(() => {
    let viewer;
    const timer = setTimeout(() => {
      // 尋找目前開啟的 popup 中的圖片容器
      const container = document.querySelector('.leaflet-popup-content .popup-images');
      if (container && window.Viewer) {
        viewer = new window.Viewer(container, {
          zIndex: 99999, // 確保高於 Leaflet 與其他 UI
          navbar: true,  // 顯示縮圖導覽
          title: false,  // 不顯示標題
          tooltip: false, // 隱藏縮放比例提示
          movable: true,  // 支援拖曳
          zoomable: true, // 支援縮放
          rotatable: false,
          scalable: false,
          transition: true,
          backdrop: true, // 點擊背景關閉
          button: true,   // 顯示右上角關閉按鈕
          toolbar: {
            zoomIn: 1,
            zoomOut: 1,
            oneToOne: 1,
            reset: 1,
            prev: 1,
            play: 0,
            next: 1,
            rotateLeft: 0,
            rotateRight: 0,
            flipHorizontal: 0,
            flipVertical: 0,
          },
        });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (viewer) {
        viewer.destroy();
      }
    };
  }, []);

  return null;
}

export default function RouteLayer({ route, polylines }) {
  return (
    <LayerGroup>
      {/* Polylines */}
      {Array.isArray(polylines[0])
        ? Array.isArray(polylines[0][0])
          ? polylines.map((seg, si) => (
            <Polyline
              key={`${route.id}-seg-${si}`}
              positions={seg}
              pathOptions={{
                color: route.color,
                weight: 4,
                opacity: 0.75,
                dashArray: null,
              }}
            />
          ))
          : (
            <Polyline
              positions={polylines}
              pathOptions={{
                color: route.color,
                weight: 4,
                opacity: 0.75,
              }}
            />
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
