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
 * flashline-shader
 *
 * Solid color shader for lines with a start and end UV value.
 * Used by the rover camera flash FX.
 */

export const uniforms = {
	start: { value: 100 },
	end: { value: 100 },
	color: { value: new THREE.Color( 0xFFFFFF ) },
	opacity: { value: 100 }
};

export const vertexShader = [
	
	'varying float vUVY;',

	'void main() {',
		'vUVY = uv.y;',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
	'}'

].join( '\n' );

export const fragmentShader = [

	'uniform float start;',
	'uniform float end;',
	'uniform float opacity;',
	'uniform vec3 color;',

	'varying float vUVY;',

	'void main() {',
		'bool discardStart = (  vUVY ) < ( start / 100.0 );',
		'bool discardEnd = ( 1.0 - vUVY ) < 1.0 - ( end / 100.0 );',
		
		'if ( discardStart || discardEnd ) discard;',

		'gl_FragColor = vec4( color, opacity / 100.0 );',
	'}'

].join( '\n' );