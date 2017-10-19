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
 * edge-shader
 *
 * Shader which simulates a wireframe effect. Used by terrain-simple.js for
 * showing simplified terrain during scene preloading. 
 *
 * The wireframe effect is generated using the fwidth function which requires
 * the oes_standard_derivatives extension to be enabled.
 *
 * Based on http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
 */

import { FogFrag, FogParamsFrag, FogVertex, FogParamsVertex } from './shader-chunks';

export const uniforms = {
	lineColor: { type: 'c', value: new THREE.Color( 0xFFFFFF ) },
	fillColor: { type: 'c', value: new THREE.Color( 0 ) },
	thickness: { value: 1.5 },
	fogColor: { type: 'c', value: new THREE.Color( 0 ) },
	fogDensity: { type: '1f', value: 0.05 },
};

export const vertexShader = [
	
	'attribute vec3 center;',

	FogParamsVertex,
	'varying vec3 vCenter;',

	'void main() {',
		FogVertex,
		'vCenter = center;',
		'gl_Position = projectionMatrix * mvPosition;',
	'}'

].join( '\n' );

export const fragmentShader = [

	'uniform vec3 lineColor;',
	'uniform vec3 fillColor;',
	'uniform float thickness;',

	FogParamsFrag,

	'varying vec3 vCenter;',

	'void main() {',
		'vec3 a3 = smoothstep( vec3( 0.0 ), fwidth( vCenter.xyz ) * thickness, vCenter.xyz );',
		'float edgeFactor = min( min( a3.x, a3.y ), a3.z );',
		'gl_FragColor = vec4( mix( lineColor, fillColor, edgeFactor ), 1.0 );',

		FogFrag,
	'}'

].join( '\n' );
