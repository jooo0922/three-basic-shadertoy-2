'use strict';

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

function main() {
  // create WebGLRenderer
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });
  renderer.autoClearColor = false; // 평면 메쉬에 애니메이션을 줄 게 아니므로 렌더러가 다음 프레임에서 새로 렌더할 때마다 기존의 color buffer를 굳이 지우지 않도록 비활성화 시킨 것.

  // 평면 메쉬 배경을 찍어줄 2*2 사이즈의 OrthographicCamera를 생성함
  const camera = new THREE.OrthographicCamera(
    -1, // left
    1, // right 
    1, // top 
    -1, // bottom
    -1, // near
    1 // far
  );

  // create scene
  const scene = new THREE.Scene();

  // 배경으로 사용할 평면 메쉬를 만드려는 것
  const plane = new THREE.PlaneGeometry(2, 2);

  // 아래에서 로드한 텍스처를 받아서 사용하는 쉐이더토이를 가져옴.
  // 이때, 균등변수 uniforms에 지정한 텍스처 iChannel10의 변수 타입을 지정해줘야 하는데, GLSL에서는 텍스처 변수 타입을 sampler2D 로 지정해 줌.
  // 그러나 얘도 결국 쉐이더토이의 쉐이더코드를 사용하는거기 때문에, fragmentShader만 지정해서 캔버스의 모든 픽셀에 색상을 연산하여 일일이 지정해 주는 방식으로 렌더함.
  // 그니까 얘도 vertexShader를 이용해서 삼각형으로 씬을 구성하는 일반적인 방법은 아니라는 것이지. 
  // 이렇게 fragmentShader만 지정해서 픽셀들의 색상값을 일일이 연산해주는 방식은 한 프레임을 그려내는 데 시간이 오래걸리는 단점이 있다고 함.
  const fragmentShader = `
  #include <common>

  uniform vec3 iResolution;
  uniform float iTime;
  uniform sampler2D iChannel0;

  // By Daedelus: https://www.shadertoy.com/user/Daedelus
  // license: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
  #define TIMESCALE 0.25 
  #define TILES 8
  #define COLOR 0.7, 1.6, 2.8

  void mainImage( out vec4 fragColor, in vec2 fragCoord )
  {
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv.x *= iResolution.x / iResolution.y;
    
    vec4 noise = texture2D(iChannel0, floor(uv * float(TILES)) / float(TILES));
    float p = 1.0 - mod(noise.r + noise.g + noise.b + iTime * float(TIMESCALE), 1.0);
    p = min(max(p * 3.0 - 1.8, 0.1), 2.0);
    
    vec2 r = mod(uv * float(TILES), 1.0);
    r = vec2(pow(r.x - 0.5, 2.0), pow(r.y - 0.5, 2.0));
    p *= 1.0 - pow(min(1.0, 12.0 * dot(r, r)), 2.0);
    
    fragColor = vec4(COLOR, 1.0) * p;
  }

  void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
  }
  `;

  // 쉐이더토이에 사용할 텍스처를 로드해 옴.
  const loader = new THREE.TextureLoader();
  const texture = loader.load('./image/bayer.png');
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter; // 텍스처를 적용하는 원본보다 텍스처가 클 때와 작을 때 모두 NearestFilter를 적용함
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping; // 텍스처의 수평, 수직 반복 유형을 모두 RepeatWrapping 으로 지정함.

  // 로드한 텍스처를 쉐이더에 사용할 균등변수 uniforms에 지정함
  const uniforms = {
    iTime: {
      value: 0
    },
    iResolution: {
      value: new THREE.Vector3()
    },
    iChannel0: {
      value: texture
    }
  }

  // 1번 예제와 마찬가지로 균등변수와 fragmentShader만 넘겨서 ShaderMaterial을 생성함.
  const material = new THREE.ShaderMaterial({
    fragmentShader,
    uniforms
  });

  // 배경용 평면 메쉬를 생성한 뒤 씬에 추가함.
  scene.add(new THREE.Mesh(plane, material));

  // resize renderer
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  // animate
  function animate(t) {
    t *= 0.001; // 밀리초 단위의 타임스탬프값을 초 단위로 변환

    // 매 프레임마다 캔버스 CSS 사이즈에 변화가 있을 경우 렌더러를 리사이징 해주는 것
    resizeRendererToDisplaySize(renderer);

    // 매 프레임마다 캔버스 사이즈에 변화가 있을 경우 iResolution 값을 현재의 캔버스 사이즈로 지정해주고, 매 프레임의 타임스탬프값을 iTime에 지정해 줌.
    const canvas = renderer.domElement;
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
    uniforms.iTime.value = t;

    renderer.render(scene, camera); // WebGLRenderer를 호출할 때마다 ShaderMaterial이 렌더되어야 하므로, 그때마다 ShaderMaterial 안에 작성한 쉐이더 코드의 함수들이 호출되는 것 같음.

    requestAnimationFrame(animate); // 내부에서 반복 호출
  }

  requestAnimationFrame(animate);
}

main();