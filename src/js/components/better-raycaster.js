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
 * better-raycaster
 *
 * An extension of AFRAME's raycaster, which implements a sort of
 * event bubbling mechanism for collision events.
 *
 * Events are sorted by an event-priority component, then by distance
 * to the raycaster origin. If multiple objects are intersected, the
 * event is emitted on all intersected objects, unless an object has
 * the 'consume-click' attribute set, which will stop the event
 * from being emitted on any objects further down the intersection
 * stack.
 *
 * If the user is using a VR hand controller and the terrain is intersected,
 * a parabola teleporation arc is calculated while the controller button is
 * pressed. This provides a nice intuitive way of selecting a teleportation
 * spot, which avoids the pitfalls of pointer precision decreasing as
 * the terrain falls away from the camera.
 */
import { Scene } from '../core/scene';
import { EventEmitter } from 'eventemitter3';

const scaleDummy = new THREE.Vector3();

import { ParabolicPointer } from '../third_party/biagioli/parabolic-pointer';

const FWD_VECTOR = new THREE.Vector3( 0, 0, -1 );
const UP_VECTOR = new THREE.Vector3( 0, 1, 0 );

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'better-raycaster', {

		isRaycaster: true,

		schema: {
			far: { default: Infinity },
			interval: { default: 0 },
			near: { default: 0 },
			objects: { default: '' },
			recursive: { default: true },
			useCursor: { default: false },
			initialVelocity: { type: 'vec3', default: new THREE.Vector3( 0, 0, -12 ) },
			acceleration: { type: 'vec3', default: new THREE.Vector3( 0, -9.8, 0 ) },
			numArcPoints: { default: 50 },
			arcPointSpacing: { default: 0.5 },
			controllerType: { default: 'mouse-touch' }
		},

		init: function() {
			this.direction = new THREE.Vector3();
			this.mouse = new THREE.Vector2();
			this.isButtonDown = false;
			this.isTouchActive = false;
			this.intersectedEls = [];
			this.objects = null;
			this.raycaster = new THREE.Raycaster();
			this.buttonHoldTime = 0;

			this.origin = new THREE.Vector3();
			this.parabolaPoints = [];
			this.parabolicPointer = new ParabolicPointer();
			this.terrainIntersection = new THREE.Vector3();
			this.lastTerrainIntersection = new THREE.Vector3();

			this.tryAddingInteraction();

			this.parent = document.getElementById( 'daydream-debug' ) || this.el;

			this.el.sceneEl.addEventListener( 'terrain-intersected', event => {
				this.lastTerrainIntersection.copy( event.detail.point );
			});

			// event for exiting vr
			Scene.on( 'on-controls-ready', this.checkForVisibility.bind( this ) );

			// used to throttle tick method on slower devices
			this.tickCount = 0;
			this.tickIncrement = ( AFRAME.utils.device.isMobile() ) ? 3 : 1;
		},

		/*
 		 * Interaction models are attatched based on controller and device type
		 */
		tryAddingInteraction() {

			const isMouseTouch = this.data.controllerType === 'mouse-touch';
			const isMobile = AFRAME.utils.device.isMobile();

			// mobile touch and cardboard
			if ( isMouseTouch && isMobile ) {
				this.el.sceneEl.addEventListener( 'touchstart', this.onTouch.bind(this) );
				this.el.sceneEl.addEventListener( 'touchend', this.onTouch.bind(this) );

			// desktop
			} else if ( isMouseTouch ) {
				this.el.sceneEl.addEventListener( 'mousemove', this.onMouseMove.bind(this) );
				this.el.sceneEl.addEventListener( 'mousedown', this.onMouseDown.bind(this) );
				this.el.sceneEl.addEventListener( 'mouseup', this.onMouseUp.bind(this) );

			// vr controllers
			} else {
				this.controller = document.getElementById( 'right-hand' );
				this.controller.addEventListener( 'buttonchanged', this.onControllerChanged.bind( this ) );
			}
		},

		checkForVisibility() {
			this.el.setAttribute( 'visible', !this.isRaycasterDeactivated() );
		},

		play: function() {
			this.el.sceneEl.addEventListener( 'child-attached', this.refreshObjects.bind( this ) );
			this.el.sceneEl.addEventListener( 'child-detached', this.refreshObjects.bind( this ) );
			this.el.sceneEl.addEventListener( 'mesh-added', this.refreshObjects.bind( this ) );
			Scene.on( 'force-added', this.refreshObjects.bind( this ) );
		},

		/**
		 * Create or update raycaster object.
		 */
		update: function() {
			if ( this.isRaycasterDeactivated() ) return;

			this.raycaster.far = this.data.far;
			this.raycaster.near = this.data.near;
			this.tryGetCamera();
			this.refreshObjects();
		},

		tryGetCamera: function() {
			if ( this.camera ) return;

			var cameraEl = document.getElementById( 'camera' );

			// This component can exist before the camera is fully set up,
			// so these checks are required to prevent null references.
			// This could probably be replaced with a try/catch block.
			if ( !cameraEl ) return;
			if ( !cameraEl.components ) return;
			if ( !cameraEl.components.camera ) return;
			if ( !cameraEl.components.camera.camera ) return;

			this.camera = cameraEl.components.camera.camera;
		},

		/**
		 * Update list of objects to test for intersection.
		 */
		refreshObjects: function () {
			// Push meshes onto list of objects to intersect.
			if ( this.data.objects ) {

				var objectEls = this.el.sceneEl.querySelectorAll( this.data.objects );

				this.objects = [];
				for ( let i = 0; i < objectEls.length; i++ ) {
					this.objects.push( objectEls[ i ].object3D );
				}
			} else {
				// If objects not defined, intersect with everything.
				this.objects = this.el.sceneEl.object3D.children;
			}
		},

		onControllerChanged: function( event ) {
			if ( this.isRaycasterDeactivated() ) return;

			if ( !this.controller.getAttribute( 'visible' ) ) {
				this.controller.setAttribute( 'visible', true );
			}
			if ( event.detail.state.pressed ) {
				this.onControllerButtonDown();
			} else {
				this.onControllerButtonUp();
			}
		},

		onControllerButtonDown: function() {
			if ( this.isButtonDown ) return;
			this.onMouseDown();
		},

		onControllerButtonUp: function() {
			if ( !this.isButtonDown ) return;
			this.onMouseUp();
		},

		onTouch: function( event ) {
			if ( this.isRaycasterDeactivated() ) return;

			if ( Scene.controllerType === 'mouse-touch' ) {
				this.mouse.x = ( event.changedTouches[ 0 ].clientX / window.innerWidth ) * 2 - 1;
				this.mouse.y = -( event.changedTouches[ 0 ].clientY / window.innerHeight ) * 2 + 1;
			} else {
				this.mouse.x = 0;
				this.mouse.y = 0;
			}

			let intersections = this.checkIntersections();

			let isTouchOverTerrain = intersections === 'collision';
			let isTouchOverSky = intersections === 'boundary-sphere';

			if ( isTouchOverTerrain || isTouchOverSky || Scene.modeType === 'vr' ) {
				this.mouse.x = 0;
				this.mouse.y = 0;
				this.checkIntersections();
			}

			switch ( event.type ) {
				case 'touchstart':
					this.isTouchActive = true;
					this.onMouseDown();
					break;
				case 'touchend':
					this.isTouchActive = true;
					this.onMouseUp();
					break;
			}
		},

		onMouseDown: function( event ) {
			if ( this.isRaycasterDeactivated() ) return;
			if ( this.isButtonDown ) return;

			var clickConsumed = false;
			this.buttonHoldTime = 0;
			this.isButtonDown = true;

			this.el.emit( 'raycaster-cursor-down', this.intersectedEls, false );

			this.intersectedEls.forEach( intersectedEl => {
				if ( !clickConsumed ) {
					intersectedEl.emit( 'raycaster-cursor-down', {
						el: this.el,
						buttonHoldTime: this.buttonHoldTime
					});

					if ( intersectedEl.hasAttribute( 'consume-click' ) ) {
						clickConsumed = true;
					}
				}
			});

		},

		onMouseUp: function( event ) {
			if ( this.isRaycasterDeactivated() ) return;

			var clickConsumed = false;
			this.isButtonDown = false;

			this.el.emit( 'raycaster-cursor-up', {
				buttonHoldTime: this.buttonHoldTime
			}, false );

			this.intersectedEls.forEach( intersectedEl => {

				if ( !clickConsumed && intersectedEl.parentNode ) {
					let name = ( intersectedEl.id === '' ) ? intersectedEl.parentNode.id : intersectedEl.id;
					intersectedEl.emit( 'raycaster-cursor-up', {
						el: this.el,
						buttonHoldTime: this.buttonHoldTime
					});

					if ( intersectedEl.hasAttribute( 'consume-click' ) ) {
						clickConsumed = true;
					}
				}
			});

			this.buttonHoldTime = 0;
		},

		onMouseMove: function( event ) {
			this.mouse.x =  ( event.clientX / window.innerWidth  ) * 2 - 1;
			this.mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
			this.checkIntersections();
		},

		tick: function ( t, dt ) {
			if ( this.isRaycasterDeactivated() ) return;
			if ( this.isTickThrottled() ) return;

			this.tryGetCamera();

			if ( this.isTouchActive ) {
				this.isTouchActive = false;
				return;
			}

			if ( this.isButtonDown ) {
				this.buttonHoldTime += dt / 1000;
			}

			if ( AFRAME.utils.device.isMobile() ) {
				this.mouse.x = 0;
				this.mouse.y = 0;
			}

			this.checkIntersections();
		},

		sortIntersections: function() {
			// Get all elements which do not have the event-priority attribute
			var elsWithoutPriority = this.intersectedEls.filter( el => {
				return !el.hasAttribute( 'event-priority' );
			});

			// Get all elements which have the event-priority attribute
			var elsWithPriority = this.intersectedEls.filter( el => {
				return el.hasAttribute( 'event-priority' );
			});

			// Sort priority elements by their priority value
			elsWithPriority.sort( ( a, b ) => {
				var priorityA = a.getAttribute( 'event-priority' );
				var priorityB = b.getAttribute( 'event-priority' );
				return priorityB - priorityA;
			});

			// Create new array from sorted priority elements
			this.intersectedEls = Array.from( elsWithPriority );

			// Add the unsorted elements without priority to the end
			elsWithoutPriority.forEach( el => { this.intersectedEls.push( el ); } );

			return this.intersectedEls;
		},

		checkIntersections: function() {
			if ( this.isRaycasterDeactivated() ) return;
			if ( !this.el.sceneEl.is( 'interactive' ) ) return;

			let currentIntersectedEl = 'none';

			this.calcParabolaArc();
			this.updateOriginDirection();

			var intersections = this.raycaster.intersectObjects( this.objects, this.data.recursive );

			// Store old previously intersected entities.
			var prevIntersectedEls = Array.from( this.intersectedEls );

			// Only keep intersections against objects that have a reference to an entity.
			intersections = intersections.filter( intersection => {
				return !!intersection.object.el;
			});

			// Only keep intersections against objects that are visible
			intersections = intersections.filter( intersection => {
				return this.isParentVisible( intersection.object );
			});

			// Update intersectedEls
			this.intersectedEls = intersections.map( intersection => {
				return intersection.object.el;
			});

			this.intersectedEls = this.sortIntersections();

			var clickConsumed = false;
			// Emit intersected on intersected entity per intersected entity.
			intersections.forEach( intersection => {
				var intersectedEl = intersection.object.el;
				intersectedEl.intersection = intersection;

				if ( !clickConsumed ) {
					currentIntersectedEl = intersectedEl.id
					intersectedEl.emit( 'raycaster-intersected', { el: this.el, intersection: intersection } );
					if ( intersectedEl.hasAttribute( 'consume-click' ) ) {
						clickConsumed = true;
					}
				} else {
					var index = this.intersectedEls.indexOf( intersectedEl );
					if ( index > -1 ) {
						this.intersectedEls.splice( index, 1 );
					}
				}
			});

			// Emit all intersections at once on raycasting entity.
			if ( intersections.length ) {
				this.el.emit( 'raycaster-intersection', {
					els: Array.from( this.intersectedEls ),
					intersections: intersections
				});
			}

			// Emit intersection cleared on both entities per formerly intersected entity.
			prevIntersectedEls.forEach( intersectedEl => {
				if ( this.intersectedEls.indexOf( intersectedEl ) !== -1 ) return;
				this.el.emit( 'raycaster-intersection-cleared', { el: intersectedEl } );
				intersectedEl.emit( 'raycaster-intersected-cleared', { el: this.el } );
			});

			return currentIntersectedEl;
		},

		isParentVisible: function( obj ) {
			if ( !obj.parent ) return obj.visible;
			if ( obj.parent.visible ) return this.isParentVisible( obj.parent );
			return false;
		},

		calcParabolaArc: function() {
			if ( Scene.controllerType !== 'controller' ) return;
			if ( !this.el ) return;
			if ( !this.parent ) return;

			this.el.object3D.updateMatrixWorld();
			this.el.object3D.getWorldPosition( this.origin );

			if ( this.lastTerrainIntersection !== undefined ) {
				this.parabolaPoints = [];
				this.parabolicPointer.calcCurve( this.origin, this.lastTerrainIntersection, this.parabolaPoints );
				this.el.emit( 'raycaster-parabola-updated', this.parabolaPoints, false );
			}
		},

		/**
		 * Set origin and direction of raycaster using entity position and rotation.
		 */
		updateOriginDirection: (function () {
			var directionHelper = new THREE.Quaternion();
			var originVec3 = new THREE.Vector3();

			// Closure to make quaternion/vector3 objects private.
			return function updateOriginDirection() {

				this.tryGetCamera();

				this.camera.updateMatrixWorld( true );
				this.el.object3D.updateMatrixWorld( true );

				this.el.object3D.matrixWorld.decompose( originVec3, directionHelper, scaleDummy );

				// If the controller type is a mouse or touch device, calculate the ray direction
				// using the camera's projection matrix and the mouse location. Otherwise, use the
				// forward vector.
				if ( Scene.controllerType === 'mouse-touch' ) {
					this.direction.set( this.mouse.x, this.mouse.y, 0.5 ).unproject( this.camera ).sub( originVec3 ).normalize();
				} else {
					this.direction.copy( FWD_VECTOR );
					this.direction.applyQuaternion( directionHelper );
				}

				this.raycaster.set( originVec3, this.direction );
			};
		})(),

		isTickThrottled: function() {
			return ( ++this.tickCount % this.tickIncrement ) != 0;
		},

		isRaycasterDeactivated: function() {
			return this.data.controllerType !== Scene.controllerType;
		}
	});
}
