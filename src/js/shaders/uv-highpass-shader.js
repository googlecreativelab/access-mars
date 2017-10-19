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
 * uv-highpass-shader
 *
 * Solid color shader which discards all fragments below a given
 * uv.y value. Used by the POI marker rings.
 */

export const uniforms = {
	cutoff: { value: 1 },
	color: { value: new THREE.Color( 0xFFFFFF ) },
};

export const vertexShader = [
	
	'varying float vUVY;',

	'void main() {',
		'vUVY = uv.y;',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
	'}'

].join( '\n' );

export const fragmentShader = [

	'uniform float cutoff;',
	'uniform vec3 color;',

	'varying float vUVY;',

	'void main() {',
		'if ( vUVY < 1.0 - cutoff ) discard;',
		'gl_FragColor = vec4( color, 1.0 );',
	'}'

].join( '\n' );