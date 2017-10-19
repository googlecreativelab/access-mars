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
 * map-site-card
 *
 * UI component which represents a single terrain site info card
 * shown at the bottom of the map-card.
 *
 * Clicking on this card will send the user to the terrain site
 * specified on the card.
 */

import { TextColorHex, TextLightColorHex } from '../core/colors';
import { ASPECT_RATIO } from './map-card';
import { AudioManager } from '../core/audio-manager';
import { Scene } from '../core/scene';
import { CardMesh } from '../meshes/card-mesh';
import { CardMeshBorder } from '../meshes/card-mesh-border';
import { CardMeshImage } from '../meshes/card-mesh-image';

const MARGIN = 0.015;
const TEXT_PADDING = 0.042;

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'map-site-card', {

		schema: {
			index: { type: 'string' },
			title: { type: 'string' },
			site: { type: 'string' },
			distance: { type: 'string' },
			height: { type: 'number', default: 0.42 }
		},

		init: function() {
			// this.hoverAmount = 0;
			this.mapCard = document.getElementById( 'map-card' );
			this.index = Array.from( this.el.parentNode.children ).indexOf( this.el );

			// Create the background card mesh
			this.background = new CardMeshBorder();

			// Create and set up the hitbox
			this.hitbox = document.createElement( 'a-entity' );
			this.hitbox.setAttribute( 'event-priority', 100 );
			this.hitbox.setAttribute( 'hitbox', {
				expansion: 0,
				cursorScale: 0.3
			});

			// Create the title label text entity
			this.siteLabel = document.createElement( 'a-entity' );
			this.siteLabel.setAttribute( 'info-card-text', {
				color: TextColorHex,
				font: 'fonts/NowAlt-Bold.json',
				letterSpacing: 3,
				transitionInDelay: 0.2,
				transitionOutSpeed: 3,
				value: this.data.title.toUpperCase(),
				width: 0.32,
				wrapCount: 10
			});

			// Create the distance label text entity
			this.distanceLabel = document.createElement( 'a-entity' );
			this.distanceLabel.setAttribute( 'info-card-text', {
				baseline: 'bottom',
				color: TextColorHex,
				font: 'fonts/NowAlt-Bold.json',
				letterSpacing: 3,
				transitionInDelay: 0.2,
				transitionOutSpeed: 3,
				value: this.data.distance,
				width: 0.32,
				wrapCount: 10
			});

			// Create the index number label text entity
			this.numberLabel = document.createElement( 'a-entity' );
			this.numberLabel.setAttribute( 'info-card-text', {
				align: 'right',
				color: TextLightColorHex,
				font: 'fonts/NowAlt-Bold.json',
				letterSpacing: 3,
				transitionInDelay: 0.2,
				transitionOutSpeed: 3,
				value: '0' + ( this.index + 1 ),
				width: 0.32,
				wrapCount: 10
			});

			// Create the squiggle divider mesh
			this.divider = new CardMeshImage( 0.225, 0.06, 'cards/squiggle.jpg' );
			this.divider.setPosition( -0.5 + 0.2 + TEXT_PADDING, -0.5 + 0.3 );
			this.divider.setDepth( 0.001 );

			// Create the background card mesh
			this.background.mesh.add( this.divider.mesh );

			// Create an entity to contain the card's text content and add the text entities to it.
			this.contentEl = document.createElement( 'a-entity' );
			this.contentEl.appendChild( this.distanceLabel );
			this.contentEl.appendChild( this.numberLabel );
			this.contentEl.appendChild( this.siteLabel );

			// Create an entity to contain the card's background mesh. This ensures that background mesh
			// is behind the content so that the render order is correct.
			this.backEl = document.createElement( 'a-entity' );
			this.backEl.setObject3D( 'mesh', this.background.mesh );
			this.backEl.appendChild( this.hitbox );

			// Add 'em up
			this.el.appendChild( this.backEl );
			this.el.appendChild( this.contentEl );

			// Bind raycaster events
			this.el.addEventListener( 'raycaster-intersected', this.onIntersect.bind( this ) );
			this.el.addEventListener( 'raycaster-intersected-cleared', this.onIntersectionCleared.bind( this ) );
			this.el.addEventListener( 'raycaster-cursor-up', this.onClick.bind( this ) );

			// Bubble the visible state up to all child entities when it is added to the map card
			this.mapCard.addEventListener( 'stateadded', event => {
				if ( event.detail.state !== 'visible' ) return;
				this.distanceLabel.addState( 'visible' );
				this.numberLabel.addState( 'visible' );
				this.siteLabel.addState( 'visible' );
				this.background.show( 0.1, 0.2 );
				this.divider.show( 0.05, 0.25 );
			});

			// Bubble the visible state up to all child entities when it is removed from the map card
			this.mapCard.addEventListener( 'stateremoved', event => {
				if ( event.detail.state !== 'visible' ) return;
				this.distanceLabel.removeState( 'visible' );
				this.numberLabel.removeState( 'visible' );
				this.siteLabel.removeState( 'visible' );
				this.el.removeState( 'hover' );
				this.background.hide( 0.1 );
				this.divider.hide( 0.05 );
			});

			this.el.addEventListener( 'selected', event => {
				this.el.addState( 'hover' );
				this.mapCard.emit( 'site-hover', this.data.site, false );
			});
		},

		onIntersect: function() {
			// Prevent the boop sound from retriggering every time the cursor moves over the hitbox.
			if ( !this.el.is( 'hover' ) ) AudioManager.playSFX( 'boop' );

			this.el.addState( 'hover' );
			this.background.hover = true;
			this.mapCard.emit( 'site-hover', this.data.site, false );
		},

		onIntersectionCleared: function() {
			this.el.removeState( 'hover' );
			this.background.hover = false;
		},

		onClick: function( event ) {
			AudioManager.playSFX( 'map' );

			// No need to jump if the same scene is selected
			if ( this.data.site === Scene.nextSite ) {
				event.stopPropagation();
				event.preventDefault();
				return;
			}

			// Tell the scene that the user wants to load the site specified by this card
			this.el.sceneEl.emit( 'on-map-clicked', this.data.site, false );
		},

		update: function() {
			const parentWidth = this.mapCard.getAttribute( 'map-card' ).width;
			const nChildren = this.el.parentNode.childElementCount;
			const cardWidth = ( parentWidth / nChildren ) - ( MARGIN - ( MARGIN / nChildren ) );
			const halfCardWidth = cardWidth / 2;
			const startX = -1 + halfCardWidth;
			const halfHeight = this.data.height / 2;
			const textXAnchor = -halfCardWidth + TEXT_PADDING;

			this.background.setSize( cardWidth, this.data.height );

			this.el.setAttribute( 'position', {
				x: startX + ( cardWidth + MARGIN ) * this.index,
				y: -ASPECT_RATIO - halfHeight - MARGIN,
				z: 0
			});

			this.siteLabel.setAttribute( 'position', {
				x: textXAnchor,
				y: halfHeight / 12,
				z: 0
			});

			this.numberLabel.setAttribute( 'position', {
				x: halfCardWidth - TEXT_PADDING,
				y: halfHeight - 0.095,
				z: 0
			});

			this.distanceLabel.setAttribute( 'position', {
				x: textXAnchor,
				y: -halfHeight,
				z: 0
			});
		},

		tick: function( t, dt ) {
			this.background.tick( dt );
			this.divider.tick( dt );
		}
	});
}
