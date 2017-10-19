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
 * horizon-marker
 *
 * UI component for marking site locations on the horizon.
 * It is built out of several pieces of simple geometry.
 *
 * Position of the marker is specified in spherical coordinates:
 * azimuth and elevation, as it was provided by JPL.
 *
 * Clicking on it transitions the user to the specified location.
 */

import { Scene } from '../core/scene';
import { TextColor } from '../core/colors';
import { AudioManager } from '../core/audio-manager';

const GradientShader = require( '../shaders/gradient-shader' );
const ColorMaskShader = require( '../shaders/color-mask-shader' );

const FLAG_Z = 1;
const POLE_H = 120;
const DISTANCE = 75;
const MARKER_DIAMETER = 40;
const FLAG_Y_OFFSET = 54;
const FLAG_Y_CENTER = FLAG_Y_OFFSET + MARKER_DIAMETER / 2;
const DEG2RAD = Math.PI / 180;

const FLAG_GEOMETRY = new THREE.PlaneBufferGeometry( MARKER_DIAMETER, MARKER_DIAMETER );
const POLE_GEOMETRY = new THREE.PlaneBufferGeometry( MARKER_DIAMETER, 1 );
	  POLE_GEOMETRY.translate( 0, -0.5, 0 );

const POLE_MATERIAL = new THREE.ShaderMaterial({
	uniforms: GradientShader.uniforms,
	vertexShader: GradientShader.vertexShader,
	fragmentShader: GradientShader.fragmentShader,
	transparent: true
});

const ICON_MATERIAL = new THREE.ShaderMaterial({
	uniforms: THREE.UniformsUtils.clone( ColorMaskShader.uniforms ),
	vertexShader: ColorMaskShader.vertexShader,
	fragmentShader: ColorMaskShader.fragmentShader
});

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'horizon-marker', {

		dependencies: [ 'visible', 'look-at-target' ],

		schema: {
			azimuth: { default: 0 },
			elevation: { default: 0 },
			site: { type: 'string' },
			size: { type: 'number', default: 0.1 }
		},

		init: function() {
			this.mapCard = document.getElementById( 'map-card' );

			this.el.addState( 'interactive' );

			this.isIntersected = false;

			this.group = new THREE.Group();
			this.el.setObject3D( 'mesh', this.group );

			this.iconMesh = new THREE.Mesh( FLAG_GEOMETRY, ICON_MATERIAL );
			this.iconMesh.scale.multiplyScalar( 1.2 );
			this.iconMesh.position.y = FLAG_Y_CENTER;
			this.iconMesh.position.z = 0.1;

			this.textureLoader = new THREE.TextureLoader();
			this.textureLoader.load( 'img/teleport.png', texture => {
				this.iconMesh.material.uniforms.map.value = texture;
				this.iconMesh.material.uniforms.color.value = new THREE.Color( 0xFFFFFF );
				this.iconMesh.material.needsUpdate = true;
			});

			this.poleMesh = new THREE.Mesh( POLE_GEOMETRY, POLE_MATERIAL );
			this.poleMesh.position.z = FLAG_Z;
			this.poleMesh.position.y = FLAG_Y_CENTER;
			this.poleMesh.scale.y = POLE_H + 100;

			this.group.add( this.iconMesh );
			this.group.add( this.poleMesh );

			this.titleLabel = document.createElement( 'a-entity' );
			this.titleLabel.setAttribute( 'poi-title-text', {
				value: 'MAP',
				yOffset: FLAG_Y_CENTER + MARKER_DIAMETER / 2
			});

			// Create hitbox
			this.hitbox = document.createElement( 'a-entity' );
			this.hitbox.setAttribute( 'hitbox', '' );
			this.hitbox.setAttribute( 'event-priority', 100 );

			// Add 'em up
			this.el.appendChild( this.titleLabel );
			this.el.appendChild( this.hitbox );

			this.el.setAttribute( 'scale', new THREE.Vector3( -this.data.size, this.data.size, this.data.size ) );

			// Calculate the marker position from JPL's azimuth and elevation data
			this.el.setAttribute( 'position', new THREE.Vector3(
				Math.sin( this.data.azimuth * DEG2RAD ) * DISTANCE,
				this.data.elevation + 5,
				Math.cos( this.data.azimuth * DEG2RAD ) * DISTANCE
			));

			// Route raycaster events to their functions
			this.el.addEventListener( 'raycaster-intersected', this.onIntersect.bind( this ) );
			this.el.addEventListener( 'raycaster-intersected-cleared', this.onIntersectionCleared.bind( this ) );
			this.el.addEventListener( 'raycaster-cursor-up', this.onClick.bind( this ) );	
		},

		onClick: function() {
			if ( !this.el.is( 'interactive' ) ) return;
			if ( !this.el.sceneEl.is( 'interactive' ) ) return;
			if ( this.el.sceneEl.is( 'modal' ) ) return;
			this.el.removeState( 'visible' );
			this.el.removeState( 'hover' );

			// Open the map card
			this.mapCard.addState( 'visible' );
		},

		onIntersect: function( event ) {
			if ( this.isIntersected ) return;
			if ( !this.el.is( 'interactive' ) ) return;

			if ( !this.isIntersected ) {
				AudioManager.playSFX( 'boop' );
			}

			// Show the label text
			this.isIntersected = true;
			this.el.addState( 'hover' );
			this.titleLabel.setAttribute( 'poi-title-text', { show: true } );
		},

		onIntersectionCleared: function( event ) {
			// Hide the label text
			this.isIntersected = false;
			this.el.removeState( 'hover' );
			this.titleLabel.setAttribute( 'poi-title-text', { show: false } );
		}
	});
}
