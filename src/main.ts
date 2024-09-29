import "./style.css";

import { Circle, Fill, Icon, Stroke, Style, Text } from "ol/style";
import { Map, View, Feature, Overlay } from "ol";
import { Tile } from "ol/layer";
import { Vector as VectorLayer } from "ol/layer";
import { Cluster, StadiaMaps, Vector, Vector as VectorSource } from "ol/source";
import { fromLonLat } from "ol/proj";
import { XYZ } from "ol/source";
import { Point } from "ol/geom";
import { GeoJSON } from "ol/format";
import { defaults } from "ol/control";
import { bbox } from "ol/loadingstrategy";
import { Select, defaults as defaultInteractions } from "ol/interaction";

import proj4 from "proj4";
import jsonp from "jsonp";
import $, { error } from "jquery";

const API_KEY = "96A99BBB-8D4D-3F1A-9F99-85032A2693D6";

$.ajax({
  type: "GET",
  url: urlBuilder("https://api.vworld.kr/req/wfs", {
    service: "WFS",
    version: "2.0.0",
    key: API_KEY,
    domain: "http://localhost:5173",
    request: "GetFeature",
    typename: "lt_c_bldginfo",
    srsname: "EPSG:3857",
    output: "application/json",
    exceptions: "application/json",
  }),
  dataType: "jsonp",
  jsonpCallback: "callback",
  success: function (data) {
    console.log(data);
  },
  error: function (e) {
    console.error(`AJAX 요청 실패 ${e.responseText} `);
  },
});

const wfsLayer = new VectorLayer({
  //source: wfs,
  style: (feature) =>
    new Style({
      stroke: new Stroke({
        color: "rgba(100, 149, 2237, 1)",
        width: 2,
      }),
      fill: new Fill({
        color: "rgba(100, 149, 237, 0.6)",
      }),
      text: new Text({
        font: "",
        fill: new Fill({ color: "white" }),
        stroke: new Stroke({
          color: "rgba(0,0,0,1)",
          width: 4,
        }),
        text: feature.get("address"),
      }),
    }),
  minZoom: 15,
  zIndex: 5,
  properties: { name: "wfs" },
});

const extent = [
  ...fromLonLat([123, 32]), // 서쪽 끝, 남쪽 끝
  ...fromLonLat([132, 43]), // 동쪽 끝, 북쪽 끝
];

// 맵 초기화
const map = new Map({
  target: "map",
  layers: [
    new Tile({
      source: new XYZ({
        url: `https://api.vworld.kr/req/wmts/1.0.0/${API_KEY}/Base/{z}/{y}/{x}.png`,
      }),
    }),
    //wfsLayer,
  ],
  controls: defaults({
    // copyright 제거
    attribution: false,
    zoom: false,
    rotate: false,
  }),
  view: new View({
    projection: "EPSG:3857",
    zoom: 16,
    minZoom: 7,
    maxZoom: 18,
    extent: extent,
    constrainOnlyCenter: true,
  }),
});

markingCurrentLocation();

let seoulMarker = makeMarker("/static/user.png", [126.978, 37.5665]);
map.addLayer(seoulMarker);
markerPopup();

// 마우스 커서 위치 출력
map.on("pointermove", (e) => {
  const [x, y] = e.coordinate;

  console.log(`좌표: x(${x}), y(${y})`);
});

// 현재 위치 출력
map.once("loadstart", (e) => {
  const [minX, minY, maxX, maxY] = map.getView().calculateExtent();
  console.log(`minX(${minX}), minY(${minY}), maxX(${maxX}), maxY(${maxY})`);
});

// 버튼 클릭시 현재 위치로 이동
document
  .getElementById("goToCurrentLocation")
  ?.addEventListener("click", (e) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { longitude, latitude } = position.coords;

        // 현재 위치로 이동시 애니메이션 효과
        map.getView().animate({
          center: [...fromLonLat([longitude, latitude])],
          zoom: 16,
          duration: 1000,
        });
      });
    }
  });

// 사용자의 현재 위치 표시
function markingCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;

        // 사용자의 위치를 OpenLayers 포맷으로 변환
        const userLocation = fromLonLat([longitude, latitude]);

        map.addLayer(
          new VectorLayer({
            source: new VectorSource({
              features: [
                new Feature({
                  geometry: new Point(userLocation),
                  name: "내 위치",
                }),
              ],
            }),
            properties: {
              name: "currentLocation",
            },
            style: new Style({
              image: new Icon({
                anchor: [0.5, 1], // 아이콘의 기준점을 맞추기 위해
                src: "/static/user.png", // 마커 이미지 경로
                scale: 0.06, //
              }),
            }),
          })
        );

        map.getView().setCenter([userLocation[0], userLocation[1]]);
      },
      (error) => {
        console.error("Geolocation error: ", error);
      }
    );
  } else {
    alert("내 위치 찾기 실패");
  }
}

// 지도에 마커 표시
function makeMarker(src: string, point: [number, number]) {
  return new VectorLayer({
    source: new VectorSource({
      features: [
        new Feature({
          geometry: new Point(fromLonLat(point)),
          name: "Null Island",
        }),
      ],
    }),
    style: new Style({
      image: new Circle({
        radius: 10,
        fill: new Fill({ color: "red" }),
        stroke: new Stroke({ color: "black", width: 2 }),
      }),
    }),
  });
}

// 마커 팝업
function markerPopup() {
  // 팝업 요소 가져오기
  const element = document.getElementById("popup");
  if (!element) {
    console.error("Popup element not found.");
    return;
  }

  // 팝업 오버레이 생성
  const popup = new Overlay({
    element: element,
    positioning: "bottom-center",
    stopEvent: false,
  });
  map.addOverlay(popup);

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

function urlBuilder(
  host: string,
  query: { [key: string]: string | number | boolean | undefined }
) {
  const param = Object.entries(query)
    .map(([key, value]) => (value ? `${key}=${encodeURIComponent(value)}` : ""))
    .join("&");

  return `${host}?${param}`;
}
