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
 * scene-intro-labels
 *
 * interstitial between terrain loading
 */

import { AudioManager } from '../core/audio-manager';
import { TextColor, TextLightColor } from '../core/colors';
import { Scene } from '../core/scene';
import { EventEmitter } from 'eventemitter3';
import TWEEN from 'tween.js';

{

	let loadingText = "LOADING:";
	let buildingText = "Building Terrain Geometry...";
	let fontName = 'fonts/NowAlt-Bold.json';

	let labels;

	let createLabel = (params) => {
		let label =  document.createElement('a-entity');

		params.align = params.align || "left";
		params.anchor = params.anchor || "left";
		params.baseline = params.baseline || "bottom";
		params.color = params.color || new THREE.Color( 0xFFFFFF );
		params.font = fontName;

		params.shader = 'msdf';

		label.setAttribute('text', params);
		return label;
	}

	let progress = 0;
	let progressBarWidth = 32;

	if ( typeof AFRAME !== 'undefined' && AFRAME ) {
		AFRAME.registerComponent( 'scene-intro-label', {

			init: function() {

				if(!labels) {

					labels = {};

					let labelsEl = [...document.querySelectorAll('.scene-intro-labels li')];
					labelsEl.forEach(l => {
						let site = l.getAttribute("data-site");
						let text = l.innerHTML.trim().split("; ");
						let index = text[0];
						let name = text[1];
						let credit = text[2];
						let date = text[3];

						labels[site] = { index, name, credit, date }
					});

				}
				this.progress = 0;
				this.targetOpacity = 0;
				this.opacity = 0;

				this.progressBg = this.el.querySelector('.progress-bg');
				this.progressBar = this.el.querySelector('.progress');

				this.loadingLabel = createLabel({
					letterSpacing: 20,
					value: loadingText,
					width: 60,
					wrapCount: 100
				});

				this.siteNameLabel = createLabel({
					letterSpacing: 8,
					width: 200,
					wrapCount: 150
				});

				this.creditLabel = createLabel({
					letterSpacing: 4,
					width: 50,
					wrapCount: 74
				});

				this.buildingLabel = createLabel({
					letterSpacing: 4,
					value: buildingText,
					width: 50,
					wrapCount: 74
				});

				this.loadingLabel.setAttribute("position", { y: 4 });
				this.siteNameLabel.setAttribute("position", { x: -0.25, y: 0 });
				this.creditLabel.setAttribute("position", { y: -1.1 });
				this.buildingLabel.setAttribute("position", { y: -7.0 });
				this.siteNameLabel.setAttribute('text', { value: '00 SITE NAME LABEL' });
				this.creditLabel.setAttribute('text', { value: 'CREDIT LABEL' });

				this.groupEl = document.createElement( 'a-entity' );
				this.groupEl.setAttribute("position", { x: -progressBarWidth / 2 });
				this.el.appendChild(this.groupEl);
				if ( !AFRAME.utils.device.isMobile() ) {
					this.el.setAttribute('position', '0, 0, -1');
				} else {
					this.el.setAttribute('position', '0, 0, -1.25');
				}

				this.groupEl.appendChild(this.loadingLabel);
				this.groupEl.appendChild(this.siteNameLabel);
				this.groupEl.appendChild(this.creditLabel);
				this.groupEl.appendChild(this.buildingLabel);


				Scene.on( 'site-changed', site => {
					this.targetOpacity = (Scene.hasSeenIntro) ? 1 : 0;
					this.setProgress( 0 );
					let opacity = { value: this.opacity }
					this.opacityTween = new TWEEN.Tween( opacity )
						.to( { value: this.targetOpacity }, 1000 )
						.easing( TWEEN.Easing.Linear.None )
						.onUpdate( () => {
							this.setOpacity( opacity.value );
						})
						.start();

					this.siteNameLabel.setAttribute('text', { value: labels[site].index + ' ' + labels[site].name.toUpperCase() });
					this.creditLabel.setAttribute('text', { value: labels[site].credit + ' ' + labels[site].date });
					this.progressBar.setAttribute('scale', { x: 0 });
					this.isLoading = true;
				});

				Scene.on( 'site-load-progress', progress => {
					this.progress = progress;
				});

				Scene.on('site-loaded', () => {
					let opacity = { value: this.opacity }
					this.opacityTween = new TWEEN.Tween( opacity )
						.to( { value: 0 }, 500 )
						.easing( TWEEN.Easing.Linear.None )
						.onUpdate( () => {
							this.setOpacity( opacity.value );
						})
						.start();
				});

				this.setOpacity( 0 );
			},

			setOpacity(v) {
				this.opacity = v;
				this.loadingLabel.setAttribute( 'text', { opacity: v });
				this.siteNameLabel.setAttribute( 'text', { opacity: v });
				this.creditLabel.setAttribute( 'text', { opacity: v });
				this.buildingLabel.setAttribute( 'text', { opacity: v });

				this.progressBar.setAttribute('material', { opacity: v });
				this.progressBg.setAttribute('material', { opacity: v });

				this.el.setAttribute('visible', v < 0.05 ? false : true);
			},

			tick() {
				if ( !this.isLoading ) return;
				this.setProgress(this.progress);
			},

			setProgress(p) {
				let x = progressBarWidth * 0.5 * (1 - p) * -1;

				this.progressBar.setAttribute('position', { x: x });
				this.progressBar.setAttribute('scale', { x: p });

			}
		});
	}

};

function tweenUpdate() {
    requestAnimationFrame(tweenUpdate);
    TWEEN.update();
}
tweenUpdate();
