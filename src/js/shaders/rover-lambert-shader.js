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
 * rover-lambert-shader
 *
 * Simple lambertian shader, used by the rover model.
 * Supports one light, passed via shader parameters.
 *
 * Uses a RGB "highlight map" image to segment texture areas
 * for highlighting when the user selects a part of the rover.
 */

import { FogColor } from '../core/colors';
import { FogFrag, FogParamsFrag, FogVertex, FogParamsVertex } from './shader-chunks';

export const uniforms = {
	map: { type: 't' },
	highlightMap: { type: 't' },
	color: { value: new THREE.Color( 0 ) },
	activeHighlightColor: { value: new THREE.Vector3( 1, 1, 1 ) },
	activeHighlightOpacity: { type: '1f', value: 0 },
	lightPosition: { value: new THREE.Vector3( 3, 10, 1 ) },
	lightIntensity: { value: 1.15 },
	fogColor: { type: 'c', value: FogColor },
	fogDensity: { type: '1f', value: 0.01 }
};

export const vertexShader = [
	
	FogParamsVertex,
	
	'varying vec3 vNormal;',
	'varying vec2 vUV;',

	'void main() {',
		FogVertex,

		'vUV = uv;',
		'vNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
	'}'

].join( '\n' );

export const fragmentShader = [

	'#define HIGHLIGHT_COLOR vec3( 0.35 )',
		
	'uniform vec3 color;',
	'uniform float lightIntensity;',
	'uniform vec3 lightPosition;',
	'uniform sampler2D map;',
	'uniform sampler2D highlightMap;',
	'uniform vec3 activeHighlightColor;',
	'uniform float activeHighlightOpacity;',

	FogParamsFrag,

	'varying vec3 vNormal;',
	'varying vec2 vUV;',

	'void main() {',

		// Basic Lambertian shading using a single infinite light
		// See: https://en.wikipedia.org/wiki/Lambertian_reflectance
		'vec3 lightDirection = normalize( lightPosition );',
		'float dotNL = dot( vNormal, lightDirection ) * 0.5 + 0.5;',
		'float irradience = dotNL * lightIntensity;',

		// Cinema4D's COLLADA exporter flips the y-axis of the UV coordinates...
		'vec2 uv = vec2( vUV.x, 1.0 + -vUV.y );',

		'float highlight = length( texture2D( highlightMap, uv ).rgb * activeHighlightColor );',

		'gl_FragColor.rgb = texture2D( map, uv ).rgb * irradience;',
		'gl_FragColor.rgb += HIGHLIGHT_COLOR * activeHighlightOpacity * highlight;',
		'gl_FragColor.rgb *= color;',
		'gl_FragColor.a = 1.0;',

		FogFrag,
	'}'

].join( '\n' );