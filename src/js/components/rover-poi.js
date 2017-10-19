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
 * rover-poi
 *
 * Point-of-interest component for rover parts. Specified
 * in the scene with a given set of target mesh names,
 * and info similar to the poi-marker component.
 *
 * Clicking on one will populate the info-card with the
 * given header text, body copy, and image, if any.
 *
 * Hitbox meshes are provided by the rover component from the
 * rover scene file.
 *
 * Rover parts with POI's are given an RGB selection mask
 * texture, which segements texture areas with various
 * colored masks. The rover-poi's "channel" attribute is used
 * to determine which color should be used as a mask for
 * highlighting the appropriate part on the rover when
 * the POI is selected with the raycaster.
 */

import { AudioManager } from '../core/audio-manager';
import { Scene } from '../core/scene';
import { TextColor, WhiteColor } from '../core/colors';

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'rover-poi', {

		dependencies: [ 'visible' ],

		schema: {
			vo: { type: 'string' },
			img: { type: 'string' },
			title: { type: 'string' },
			text: { type: 'string' },
			target: { type: 'string' },
			channel: { type: 'string' }
		},

		init: function() {
			this.titleOpacity = 0;
			this.updateTitleOpacity = false;
			this.isIntersected = false;
			this.targetMaterials = [];

			// The POI's hitbox is added thru a mesh-added event which 
			// passes in the relevant hitbox mesh from the rover scene.
			this.el.addEventListener( 'mesh-added', event => {
				this.metadata = event.detail.metadata;
				this.mesh = event.detail.children[ 0 ];
				this.mesh.material.visible = false;

				this.el.setObject3D( 'mesh', this.mesh );

				// Apply scale and rotation to match the rover mesh
				this.el.object3D.scale.multiplyScalar( 0.01 );
				this.el.object3D.rotation.y += Math.PI / 2.0;

				this.el.classList.add( 'clickable' );
				this.el.addState( 'interactive' );
				this.el.setAttribute( 'consume-click', '' );
				this.el.sceneEl.emit( 'mesh-added', null, false );
			});

			this.el.addEventListener( 'materials-added', event => {
				this.targetMaterials = Array.from( event.detail );
			});

			this.el.addEventListener( 'raycaster-intersected', this.onIntersect.bind( this ) );
			this.el.addEventListener( 'raycaster-intersected-cleared', this.onIntersectionCleared.bind( this ) );
			this.el.addEventListener( 'raycaster-cursor-up', this.onClick.bind( this ) );

			this.childIndex = Array.from( this.el.parentNode.children ).indexOf( this.el ) + 1;
			this.cursor = document.getElementById( 'controller-dot' );
		},

		update: function() {
			switch ( this.data.channel ) {
				case 'r': this.channelSelect = new THREE.Vector3( 1, 0, 0 ); break;
				case 'g': this.channelSelect = new THREE.Vector3( 0, 1, 0 ); break;
				case 'b': this.channelSelect = new THREE.Vector3( 0, 0, 1 ); break;
				 default: this.channelSelect = new THREE.Vector3( 1, 1, 1 ); break;
			}
		},

		onClick: function() {
			if ( !this.el.is( 'interactive' ) ) return;
			if ( !this.el.sceneEl.is( 'interactive' ) ) return;

			this.onClickShowCard();
		},

		onIntersect: function( event ) {
			if ( this.isIntersected ) return;
			if ( !this.el.is( 'interactive' ) ) return;
			if ( !this.el.sceneEl.is( 'interactive' ) ) return;
			if ( !this.cursor ) return;

			// Delay the highlight state by a frame. The rover chassis part has multiple
			// highlight zones which all share a material. If the user hovers over one, then
			// moves to another without selecting a non-chassis part in-between, the highlight
			// state will not be applied correctly. This delay allows the chassis material
			// to update before changing the highlight state.
			setTimeout( () => {
				document.body.classList.add( 'pointer' );	

				this.cursor.setAttribute( 'controller-dot', {
					color: TextColor
				});

				if ( !this.isIntersected ) {
					AudioManager.playSFX( 'boop' );
				}

				this.isIntersected = true;
				this.el.addState( 'hover' );

				this.targetMaterials.forEach( mesh => {
					mesh.material.uniforms.activeHighlightColor.value = this.channelSelect;
					mesh.material.uniforms.activeHighlightOpacity.value = 1;
					mesh.material.needsUpdate = true;
				});
			}, 5 );
		},

		onIntersectionCleared: function( event ) {
			document.body.classList.remove( 'pointer' );

			this.isIntersected = false;
			this.el.removeState( 'hover' );

			// Reset the cursor color
			this.cursor.setAttribute( 'controller-dot', {
				color: WhiteColor
			});

			// Clear the highlight opacity for all target materials
			this.targetMaterials.forEach( mesh => {
				mesh.material.uniforms.activeHighlightOpacity.value = 0;
				mesh.material.needsUpdate = true;
			});
		},

		onClickShowCard: function() {

			this.el.removeState( 'interactive' );

			AudioManager.playVO( this.data.vo );

			this.infoCard = document.getElementById( 'info-card' );
			this.infoCard.setAttribute( 'info-card', {
				url: this.data.img,
				title: this.data.title,
				text: this.el.textContent,
				type: 'rover',
				index: this.childIndex.toString()
			});

			this.infoCard.addState( 'visible' );

			// Forces info card to update even if the user clicks on the same marker. This
			// allows the transition to reset correctly.
			this.infoCard.components[ 'info-card' ].update(); 

			// Set up event listener to restore the interactive state when the card
			// is closed.
			var onInfoCardHideComplete = event => {
				this.infoCard.removeEventListener( 'hide-complete', onInfoCardHideComplete );
				this.el.addState( 'interactive' );
				AudioManager.stopVO();
			};

			this.infoCard.addEventListener( 'hide-complete', onInfoCardHideComplete );
		}
	});
}
