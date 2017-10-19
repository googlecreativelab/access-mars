// Copyright 2017 Google Inc.
//
//   Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
// limitations under the License.


/**
 * terrain-shader
 *
 * Flat textured shader used by the terrain geometry.
 *
 * Can overlay a world-positioned grid graphic during VR teleporation,
 * and supports a goofy triangle transition animation.
 */

import { FogColor } from '../core/colors';
import { FogFrag, FogParamsFrag, FogVertex, FogParamsVertex } from './shader-chunks';

export const uniforms = {
	terrainTex: { type: 't' },
	gridTex: { type: 't' },
	triangleTex: { type: 't' },
	gridPosition: { value: new THREE.Vector3() },
	tileCenter: { value: new THREE.Vector2() },
	gridOpacity: { type: '1f', value: 1 },
	fogColor: { type: 'c', value: FogColor },
	fogDensity: { type: '1f', value: 0.01 },
	animIn: { type: '1f', value: 0 }
};

export const vertexShader = [
	
	'uniform vec3 gridPosition;',
	'uniform vec2 tileCenter;',

	'varying vec2 vUV;',
	'varying vec2 gridUV;',
	'varying vec2 vLocalUV;',
	FogParamsVertex,

	'void main() {',
		FogVertex,
		'vUV = uv;',
		'vLocalUV = ( ( position.xz + 16.0 ) / 32.0 );',
		'vec3 worldPosition = ( ( position / 16.0 ) * 4.0 ) - gridPosition;',
		'gridUV = clamp( worldPosition.xz, 0.0, 1.0 );',

		'gl_Position = projectionMatrix * mvPosition;',
	'}'

].join( '\n' );

export const fragmentShader = [

	'uniform sampler2D terrainTex;',
	'uniform sampler2D triangleTex;',
	'uniform sampler2D gridTex;',
	'uniform float gridOpacity;',
	'uniform float animIn;',

	FogParamsFrag,

	'varying vec2 vUV;',
	'varying vec2 gridUV;',
	'varying vec2 vLocalUV;',

	'void main() {',
		// Cinema4D's COLLADA exporter flips the y-axis of the UV coordinates...
		'vec2 uv = vec2( vUV.x, 1.0 + -vUV.y );',

		'float triangle = texture2D( triangleTex, fract( vLocalUV ) ).r;',
		'if ( triangle >= animIn ) discard;',
		'gl_FragColor = vec4( texture2D( terrainTex, uv ).rgb + ( texture2D( gridTex, gridUV ).rgb ) * gridOpacity, 1.0 );',
		FogFrag,
	'}'

].join( '\n' );