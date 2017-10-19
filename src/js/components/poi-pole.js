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
 * poi-pole
 *
 * Pole & Ring mesh for the POI markers. Handles loading the mesh
 * and updating the animated transitions
 */

import { C4DExportLoader } from '../c4d/c4d-export-loader';
import { C4DUtils } from '../c4d/c4d-utils';
import { MathUtils } from '../utils/math-utils';
import { POIAnimInDelay } from './poi-marker';

const BezierEasing = require( 'bezier-easing' );
const UVHighpassShader = require( '../shaders/uv-highpass-shader' );

const POLE_ANIM_IN_DURATION = 0.5;
const RING_ANIM_IN_DURATION = 0.65;
const RING_ANIM_IN_DELAY = 0.2;
const POLE_ANIM_IN_EASING = BezierEasing( 0.3, 0, 0.6, 1 );
const RING_ANIM_IN_EASING = BezierEasing( 0.7, 0, 0.2, 1 );

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'poi-pole', {

		init: function() {
			this.poleAnimIn = 0;
			this.ringAnimIn = 0;

			// Listen for a special event which is triggered by poi-marker. 
			// The poleMesh and ringMesh are reassigned as direct children of 
			// their parent poi-marker element such that the auto-generated
			// hitbox generation can work correctly. This element still needs
			// a reference to them though, in order to animate them. This event
			// reassigns that reference.
			this.el.addEventListener( 'reassign-meshes', event => {
				this.el.ringMesh = event.detail.ringMesh;
				this.el.poleMesh = event.detail.poleMesh;
			});

			const loader = new C4DExportLoader();
			loader.load( 'markers/pole.glb' ).then( response => {

				this.scene = response.scene;
				this.el.setObject3D( 'mesh', this.scene );
				
				this.scene.traverse( node => {
	
					if ( !node.metadata ) return;

					// Get the ring mesh out of the scene
					if ( node.metadata.type === 'RING' ) {
						this.el.ringMesh = C4DUtils.getChildWithType( node, 'Mesh' );
						return;
					}

					// Get the pole mesh out of the ring
					if ( node.metadata.type === 'POLE' ) {
						this.el.poleMesh = C4DUtils.getChildWithType( node, 'Mesh' );
						return;
					}
				});
					
				// Set up ring material
				this.el.ringMesh.material = new THREE.ShaderMaterial({
					uniforms: THREE.UniformsUtils.clone( UVHighpassShader.uniforms ),
					vertexShader: UVHighpassShader.vertexShader,
					fragmentShader: UVHighpassShader.fragmentShader
				});

				// Set up pole material
				this.el.poleMesh.material = new THREE.ShaderMaterial({
					uniforms: THREE.UniformsUtils.clone( UVHighpassShader.uniforms ),
					vertexShader: UVHighpassShader.vertexShader,
					fragmentShader: UVHighpassShader.fragmentShader
				});

				this.reset();
				
				this.el.emit( 'load-complete', null, false );
			});

			// Offset the ring's "timeline" by the delay constant
			this.el.addEventListener( 'stateadded', event => {
				if ( event.detail.state !== 'visible' ) return;
				this.reset();	
			});
		},

		reset: function() {
			this.ringAnimIn = -( RING_ANIM_IN_DELAY + POIAnimInDelay );
			this.poleAnimIn = -POIAnimInDelay;
		},

		/**
		 * Update the transition animation state
		 */
		tick: function( t, dt ) {
			// Adjust delta time so that it is 0..1 over ANIM_IN_DURATION seconds
			const dtRing = ( dt / 1000 ) * ( 1 / RING_ANIM_IN_DURATION );
			const dtPole = ( dt / 1000 ) * ( 1 / POLE_ANIM_IN_DURATION );

			// Roll the transition animation forward to 1 if this element is visible,
			// otherwise roll it back to 0.
			if ( this.el.is( 'visible' ) ) {
				this.poleAnimIn += dtPole;
				this.ringAnimIn += dtRing;
			} else {
				this.poleAnimIn -= dtPole;
				this.ringAnimIn -= dtRing;
			}

			this.updateRingMeshMaterial();
			this.updatePoleMeshMaterial();
		},

		/**
		 * Update the ring mesh's material with the value from ringAnimIn
		 */
		updateRingMeshMaterial: function() {
			if ( !this.el.ringMesh ) return;
			if ( !this.el.ringMesh.material ) return;

			const clampedRingAnimIn = MathUtils.clamp( this.ringAnimIn, 0, 1 );
			this.el.ringMesh.material.uniforms.cutoff.value = RING_ANIM_IN_EASING( clampedRingAnimIn );
		},

		/**
		 * Update the pole mesh's material with the value from poleAnimIn
		 */
		updatePoleMeshMaterial: function() {
			if ( !this.el.poleMesh ) return;
			if ( !this.el.poleMesh.material ) return;

			const clampedPoleAnimIn = MathUtils.clamp( this.poleAnimIn * 1.75, 0, 1 );
		 	this.el.poleMesh.material.uniforms.cutoff.value = clampedPoleAnimIn;
		}
	});
}
