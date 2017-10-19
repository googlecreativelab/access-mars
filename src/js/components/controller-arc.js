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

import { Scene } from '../core/scene';
import { MathUtils } from '../utils/math-utils';

const BezierEasing = require( 'bezier-easing' );
const ControllerRayShader = require( '../shaders/controller-ray-shader' );

const DASH_SPEED = 2.5;
const ANIM_IN_DURATION = 0.75;
const NEAR_DISTANCE_THRESHOLD = 2;
const EASING = BezierEasing( 0.66, 0, 0.33, 1 );

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'controller-arc', {

		schema: {
			width: { type: 'number', default: 0.02 }
		},

		init: function() {
			this.parentPosition = new THREE.Vector3();
			this.parentVelocity = new THREE.Vector3();
			this.cursorPosition = new THREE.Vector3();
			this.cursorVelocity = new THREE.Vector3();
			this.targetPosition = new THREE.Vector3();
			this.distance = 0;
			this.outOfBounds = 0;
			this.animIn = 1;

			var geometry = new THREE.CylinderGeometry( 0.5, 0.5, 1, 64, 1, true, Math.PI * 1.5, Math.PI );
				geometry.rotateX( Math.PI / -2 );
				geometry.rotateY( Math.PI / -2 );
				geometry.translate( 0, 0, 0.5 );

			this.material = new THREE.ShaderMaterial({
				uniforms: THREE.UniformsUtils.clone( ControllerRayShader.uniforms ),
				fragmentShader: ControllerRayShader.fragmentShader,
				vertexShader: ControllerRayShader.vertexShader,
				side: THREE.DoubleSide
			});

			// Set up dash material uniforms
			this.material.uniforms.axis.value = new THREE.Vector2( 1, 0 );
			this.material.uniforms.dashSpacing.value = 0.05;

			this.mesh = new THREE.Mesh( geometry, this.material );
			this.mesh.visible = false;

			this.group = new THREE.Group();
			this.group.add( this.mesh );
			this.el.setObject3D( 'mesh', this.group );

			// Listen for intersection events
			this.el.sceneEl.addEventListener( 'terrain-intersected', this.onIntersected.bind( this ) );
			this.el.sceneEl.addEventListener( 'terrain-intersected-cleared', this.onIntersectClearered.bind( this ) );

			document.addEventListener( 'mousemove', this.onMoved.bind( this ) );

			this.el.sceneEl.addEventListener( 'stateremoved', event => {
				if ( event.target !== this.el.sceneEl ) return;
				if ( event.detail.state !== 'interactive' ) return;

				this.mesh.visible = false;
			});

			this.el.sceneEl.addEventListener( 'stateadded', event => {
				if ( event.target !== this.el.sceneEl ) return;
				if ( event.detail.state !== 'interactive' ) return;

				this.mesh.visible = true;
			});

			// event for exiting vr
			Scene.on( 'on-controls-ready', this.checkForVisibility.bind( this ) );
		},

		checkForVisibility() {
			this.el.setAttribute( 'visible', Scene.controllerType === 'mouse-touch' );
		},

		update: function() {
			this.parent = document.getElementById( 'arc-dummy' );
		},

		onIntersected: function( event ) {
			if ( this.controllerType === 'controller' ) return;

			this.targetPosition = event.detail.point;
			// this.updateArcPosition( event.detail.point );
			this.outOfBounds = 2;
		},

		onIntersectClearered: function( event ) {
			this.outOfBounds = -1;
		},

		onMoved: function( event ) {
			this.outOfBounds--;
		},

		tick: function( t, dt ) {
			if ( !this.parent ) return;
			if ( !this.mesh.visible ) return;

			dt = ( dt / 1000 );

			// Move mesh to parent's world position
			this.parent.object3D.getWorldPosition( this.parentPosition );

			// Compensate for camera height
			this.parentPosition.y -= 1.6;

			// Smooth the cursor and mesh position to remove jitter caused by the tick loop and the cursor
			// update loop being out of sync.
			MathUtils.smooth3D( this.cursorPosition, this.targetPosition, this.cursorVelocity, dt, 0.05, 500 );
			MathUtils.smooth3D( this.mesh.position, this.parentPosition, this.parentVelocity, dt, 0.05, 500 );

			// Update the distanace from the arc to the cursor
			this.distance = this.parentPosition.distanceTo( this.cursorPosition );

			// As the cursor position gets further away from the camera, the arc becomes taller
			const height = MathUtils.clamp( this.distance * 0.75, 1, 10 );

			// Set the cylinder's scale and rotation so that it intersects with the cursor point
			this.mesh.scale.copy( new THREE.Vector3( this.data.width, height, this.distance ) );
			this.mesh.lookAt( this.cursorPosition );

			// Only show the cursor if it is inside the valid boundaries
			if ( this.distance > NEAR_DISTANCE_THRESHOLD && this.outOfBounds > 0 ) {
				this.animIn = MathUtils.clamp( this.animIn + ( dt * ( 1 / ANIM_IN_DURATION ) ), 0, 1 );
			} else {
				this.animIn = 0;
			}

			// Update uniform values
			this.material.uniforms.dashSpacing.value = ( 0.5 / this.distance ) / 2;
			this.material.uniforms.t.value = ( t / 1000 ) * DASH_SPEED;
			this.material.uniforms.show.value = EASING( this.animIn );
		}
	});
}
