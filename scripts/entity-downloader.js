console.info('Platform Entities Extractor Loaded');

export class HassEntityDownloader {
	constructor(hassInstance) {
		this._hass = hassInstance;
	}

	async getEntitiesByPlatform(platformToFind) {
		// Fetch all entities from the config entity registry
		const allEntities = await this._hass.callWS({
			type: 'config/entity_registry/list',
		});

		// Filter to get all sub-entities for the device
		const platformEntities = allEntities.filter((e) => e.platform === platformToFind);

		if (!platformEntities || platformEntities.length === 0) {
			console.log('Entities not found');
			return;
		}

		console.log('Raw data:', platformEntities);
		this.downloadJSON(platformEntities, `${platformToFind}_raw_data.json`);
		const entStates = {};

		for (const entity of platformEntities) {
			const entityState = this._hass.states[entity.entity_id];
			if (entityState) {
				const entState = entityState.state;
				const entityId = entity.entity_id;
				const originalName = entity.original_name;
				const uniqueId = entity.unique_id;
				const entAttr = entityState.attributes;
				entStates[entityId] = {
					original_name: originalName,
					unique_id: uniqueId,
					state: entState,
					attributes: entAttr,
				};

				// console.log(`| ${friendlyName.padEnd(40)} | ${entityId.padEnd(45)} | ${formattedState}`.replace(/ /g, " "));
			} else {
				console.log(
					`| ${entityState.attributes.friendly_name.padEnd(22)} | ${entity.entity_id.padEnd(24)} | -`.replace(
						/ /g,
						' ',
					),
				);
			}
		}

		if (Object.keys(entStates).length > 0) {
			console.log('Entities with state:', entStates);
			this.downloadJSON(entStates, `${platformToFind}_state_data.json`);
		}
	}

	downloadJSON(data, filename) {
		const jsonStr = JSON.stringify(data, null, 2); // Convert object to JSON string
		const blob = new Blob([jsonStr], { type: 'application/json' }); // Create a Blob object
		const url = URL.createObjectURL(blob); // Create a URL for the Blob object
		const a = document.createElement('a'); // Create a link element
		a.href = url; // Set the download URL
		a.download = filename; // Set the file name
		document.body.appendChild(a); // Append the link to the body
		a.click(); // Trigger the download by simulating a click
		document.body.removeChild(a); // Remove the link from the body
		URL.revokeObjectURL(url); // Revoke the object URL to free up memory
	}
}
const hassInstance = document.querySelector('home-assistant').hass;
window.hassEntityDownloader = new HassEntityDownloader(hassInstance);
