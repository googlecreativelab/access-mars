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
 * controller-parabola
 *
 * Parabola arc for teleportation aiming on mobile devices.
 *
 * This handles the display of the parabola arc in the scene;
 * better-raycaster emits parabola update events which are calculated
 * by the ParabolicPointer class: third_party/biagoioli/parabolic-pointer
 */

import { Scene } from '../core/scene';
import { MeshLineMaterial } from '../third_party/spite/mesh-line-material';

const BezierEasing = require( 'bezier-easing' );
const MeshLine = require( '../third_party/spite/mesh-line' ).MeshLine;

const DASH_SPEED = 2.5;
const SHOW_SPEED = 0.2;
const SHOW_EASING = BezierEasing( 0.66, 0, 0.33, 1 );

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'controller-parabola', {

		schema: {
			width: { default: 0.015 },
		},

		init: function() {
			this.parabolaPoints = [];
			this.show = 1;
			this.isOverTerrain = false;
			this.resolution = new THREE.Vector2( window.innerWidth, window.innerHeight );

			this.raycasterEl = document.getElementById( 'right-hand' );

			// Grab arc point updates from the raycaster
			this.raycasterEl.addEventListener( 'raycaster-parabola-updated', event => {
				this.parabolaPoints = event.detail;
			});

			// Show the arc when the user presses the controller button
			this.raycasterEl.addEventListener( 'raycaster-cursor-down', event => {
				if ( Scene.controllerType !== 'controller' ) return;
				if ( !this.el.sceneEl.is( 'interactive' ) ) return;
				if ( this.el.sceneEl.is( 'modal' ) ) return;
				if ( !event.detail ) return;
				if ( event.detail[ 0 ].id !== 'collider' ) return;

				this.mesh.visible = true;
			});

			// Listen for intersection events
			this.el.sceneEl.addEventListener( 'terrain-intersected', () => {
				if ( Scene.controllerType !== 'controller' ) return;
				if ( !this.el.sceneEl.is( 'interactive' ) ) return;
				this.isOverTerrain = true;
				this.mesh.visible = true;
			});

			this.el.sceneEl.addEventListener( 'terrain-intersected-cleared', () => {
				this.isOverTerrain = false;
				this.mesh.visible = false;
			});

			// Hide the arc whenever the scene is not interactive
			this.el.sceneEl.addEventListener( 'stateremoved', event => {
				if ( event.target !== this.el.sceneEl ) return;
				if ( event.detail.state === 'interactive' ) this.mesh.visible = false;
			});

			// event for exiting vr
			Scene.on( 'on-controls-ready', this.checkForVisibility.bind( this ) );
		},

		checkForVisibility() {
			this.el.setAttribute( 'visible', Scene.controllerType === 'controller' );
		},

		play: function() {
			this.numPoints = this.raycasterEl.getAttribute( 'better-raycaster' ).numArcPoints;

			// Populate  mesh vertices with zero vectors. It will be filled with
			// actual vectors when the cursor is updated
			this.geometry = new THREE.Geometry();
			for ( let i = 0; i < this.numPoints + 1; i++ ) {
				this.geometry.vertices.push( new THREE.Vector3() );
			}

			this.line = new MeshLine();
			this.line.setGeometry( this.geometry );

			this.material = new MeshLineMaterial({
				color: new THREE.Color( 0xFFFFFF ),
				lineWidth: this.data.width,
				resolution: this.resolution
			});

			this.mesh = new THREE.Mesh( this.line.geometry, this.material );
			this.mesh.frustumCulled = false;
			this.mesh.visible = false;
			this.el.setObject3D( 'mesh', this.mesh );

			window.addEventListener( 'resize', this.onResize.bind( this ) );
		},

		onResize: function() {
			// Update the resolution material property required by MeshLine
			this.resolution = new THREE.Vector2( window.innerWidth, window.innerHeight );
			this.material.uniforms.resolution.value = this.resolution;
			this.material.needsUpdate = true;
		},

		tick: function( t, dt ) {
			if ( Scene.controllerType !== 'controller' ) return;
			if ( !this.mesh ) return;
			if ( !this.mesh.visible ) return;
			if ( !this.parabolaPoints.length ) return;
			if ( !this.isOverTerrain ) return;

			// Transfer updated parabola points to the mesh vertices
			this.geometry.vertices = this.geometry.vertices.map( ( v, i ) => {
				return this.parabolaPoints[ Math.min( i, this.parabolaPoints.length - 1 ) ];
			});

			this.line.setGeometry( this.geometry );

			// Update material
			this.material.uniforms.visibility.value = SHOW_EASING( this.show );
			this.material.uniforms.t.value = ( t / 1000 ) * DASH_SPEED;
			this.material.needsUpdate = true;
		}
	});
}
