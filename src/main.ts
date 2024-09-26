import "./style.css";

import { Circle, Fill, Icon, Stroke, Style } from "ol/style";
import { Map, View, Feature, Overlay } from "ol";
import { Tile } from "ol/layer";
import { Vector as VectorLayer } from "ol/layer";
import { Cluster, StadiaMaps, Vector as VectorSource } from "ol/source";
import { fromLonLat } from "ol/proj";
import { XYZ } from "ol/source";
import { Point } from "ol/geom";
import { GeoJSON } from "ol/format";
import { defaults } from "ol/control";
import { Select, defaults as defaultInteractions } from "ol/interaction";

// 맵 초기화
const map = new Map({
  target: "map",
  layers: [
    new Tile({
      source: new XYZ({
        url: "https://api.vworld.kr/req/wmts/1.0.0/{API-KEY}/Base/{z}/{y}/{x}.png",
      }),
    }),
  ],
  controls: defaults({
    // copyright 제거
    attribution: false,
    zoom: false,
    rotate: false,
  }),
});

markingCurrentLocation();

let seoulMarker = makeMarker("/static/user.png", [126.978, 37.5665]);
map.addLayer(seoulMarker);
markerPopup();

map.on("pointermove", (e) => {
  const [x, y] = e.coordinate;

  console.log(`좌표: x(${x}), y(${y})`);
});

map.on("click", (e) => {
  const [minX, minY, maxX, maxY] = e.map.getView().calculateExtent();
  console.log(`minX(${minX}), minY(${minY}), maxX(${maxX}), maxY(${maxY})`);
});

// 사용자의 현재 위치 가져오기
function markingCurrentLocation() {
  const extent = [
    ...fromLonLat([123, 32]), // 서쪽 끝, 남쪽 끝
    ...fromLonLat([132, 43]), // 동쪽 끝, 북쪽 끝
  ];

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lon = position.coords.longitude;
        const lat = position.coords.latitude;

        // 사용자의 위치를 OpenLayers 포맷으로 변환
        const userLocation = fromLonLat([lon, lat]);

        // 사용자 위치 마커 추가
        const userMarker = new Feature({
          geometry: new Point(userLocation),
        });

        const userStyle = new Style({
          image: new Icon({
            anchor: [0.5, 1], // 아이콘의 기준점을 맞추기 위해
            src: "/static/user.png", // 마커 이미지 경로
            scale: 0.06,
          }),
        });

        userMarker.setStyle(userStyle);

        // 사용자 위치 레이어 추가
        const vectorSource = new VectorSource({
          features: [userMarker],
        });

        const vectorLayer = new VectorLayer({
          source: vectorSource,
        });

        map.addLayer(vectorLayer);

        // 지도 중심을 사용자 위치로 이동
        map.setView(
          new View({
            projection: "EPSG:3857",
            center: userLocation,
            zoom: 16,
            minZoom: 7,
            maxZoom: 18,
            extent: extent,
            //minResolution: 100,
            constrainOnlyCenter: true, // 중심만 제한 (이동 시 중심 제한)
          })
        );
      },
      (error) => {
        console.error("Geolocation error: ", error);
      }
    );
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

// 지도에 마커 표시
function makeMarker(src: string, point: [number, number]) {
  // 마커 위치 설정 (서울 좌표)
  const markerPosition = new Point(fromLonLat(point));

  // 마커 생성
  const iconFeature = new Feature({
    geometry: markerPosition,
    name: "Null Island",
  });

  // 사용자 위치 마커 스타일 설정
  const iconStyle = new Style({
    image: new Circle({
      radius: 10,
      fill: new Fill({ color: "red" }),
      stroke: new Stroke({ color: "black", width: 2 }),
    }),
  });

  iconFeature.setStyle(iconStyle);

  // 벡터 소스에 마커 추가
  const vectorSource = new VectorSource({
    features: [iconFeature],
  });

  // 벡터 레이어에 벡터 소스 추가
  const vectorLayer = new VectorLayer({
    source: vectorSource,
  });

  return vectorLayer;
}

// 마커 팝업
function markerPopup() {
  // 팝업 요소 가져오기
  const element = document.getElementById("popup");

  if (!element) {
    console.error("Popup element not found.");
    return;
  }

  const popup = new Overlay({
    element: element,
    positioning: "bottom-center",
    stopEvent: false,
  });

  map.addOverlay(popup);
  // 팝업 오버레이 생성

  // 팝업 닫기 버튼 기능
  const closer = document.getElementById("popup-closer");

  if (closer) {
    closer.addEventListener("click", () => {
      popup.setPosition(undefined);
      closer.blur();
      return false;
    });
  }

  // 클릭 시 팝업 표시
  map.on("click", function (evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      return feature;
    });

    if (feature) {
      const geometry = feature.getGeometry();
      const geometryType = geometry?.getType();

      let coordinates;
      if (geometryType === "Point") {
        coordinates = (geometry as Point).getCoordinates();
      }
      const content = document.getElementById("popup-content")!;

      // Feature의 'name' 속성 가져오기
      content.innerHTML = "<p>" + feature.get("name") + "</p>";

      // 팝업 위치 설정
      popup.setPosition(coordinates);
    } else {
      // 팝업 닫기
      popup.setPosition(undefined);
    }
  });
}
