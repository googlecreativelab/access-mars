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
 * map-path-shader
 *
 * Flat color shader which masks two colors along the UV.x axis,
 * based on a fill parameter. Used by map-path.
 */

export const uniforms = {
	fill: { value: 0.5 },
	colorA: { value: new THREE.Color() },
	colorB: { value: new THREE.Color( 0xFF00FF ) },
	opacity: { value: 1 }
};

export const vertexShader = [
	
	'varying float xUV;',

	'void main() {',
		'xUV = uv.x;',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
	'}'

].join( '\n' );

export const fragmentShader = [
	
	'uniform float fill;',
	'uniform vec3 colorA;',
	'uniform vec3 colorB;',
	'uniform float opacity;',

	'varying float xUV;',

	'void main() {',
		'gl_FragColor.rgb = mix( colorA, colorB, step( fill, xUV ) );',
		'gl_FragColor.a = opacity;',
	'}'

].join( '\n' );