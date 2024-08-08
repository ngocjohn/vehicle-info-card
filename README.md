<a name="readme-top"></a>

[![Validate](https://github.com/ngocjohn/vehicle-info-card/actions/workflows/validate.yaml/badge.svg)](https://github.com/ngocjohn/vehicle-info-card/actions/workflows/validate.yaml) ![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/ngocjohn/vehicle-info-card/total?style=flat&logo=homeassistantcommunitystore&logoSize=auto&label=Downloads&color=%2318BCF2) ![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/ngocjohn/vehicle-info-card/latest/total?style=flat&logo=homeassistantcommunitystore&logoSize=auto)

# 🚙 Vehicle info card

<a href="#"><img src="https://raw.githubusercontent.com/ngocjohn/vehicle-info-card/main/assets/vehicle-header.gif" style="border-radius: 8px"></a>

<br>

<p style="text-align: justify;">This custom card displays essential information about your Mercedes vehicle. It retrieves data using the Custom Component for Mercedes cars by <a href="https://github.com/ReneNulschDE">ReneNulschDE</a> available at <a href="https://github.com/ReneNulschDE/mbapi2020">mbapi2020</a>. The card features four primary buttons: Trip Data, Vehicle Status, Eco Display, and Tire Pressure. These buttons can be easily replaced with any Lovelace card within Home Assistant, allowing for flexible and customizable vehicle data display.</p>

## Features of the Card

- **Comprehensive Vehicle Information**: Provides essential information about the car all in one place.

- **Vehicle Position Display**: Shows the current location of the vehicle on a map, with the option to track routes.
- **Visual Slideshow**: Features a visual slideshow of the vehicle.
- **Centralized Remote Control**: Offers available remote control functions and settings, all accessible from a single card.
- **Individual Sub-Card Customization**: Allows customization for each individual sub-card to suit specific needs and preferences.

### View options

<img src="https://raw.githubusercontent.com/ngocjohn/vehicle-info-card/main/assets/card-views.png">

### Sub cards

<img src="https://raw.githubusercontent.com/ngocjohn/vehicle-info-card/main/assets/card-summary.png">

## Installation

### [HACS](https://hacs.xyz) (Home Assistant Community Store)

1. Go to HACS page on your Home Assistant instance

2. Add this repository via HACS Custom repositories [How to add Custom Repositories](https://hacs.xyz/docs/faq/custom_repositories/)

   ```
   https://github.com/ngocjohn/vehicle-info-card
   ```

3. Select `Lovelace`

4. Press add icon and search for `Vehicle Info Card`
5. Select Vehicle Info Card repo and install
6. Force refresh the Home Assistant page `Ctrl` + `F5` / `Shift` + `⌘` + `R`
7. Add vehicle-info-card to your page

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=ngocjohn&repository=vehicle-info-card&category=plugin)

### Manual

<details>
  <summary>Click to expand installation instructions</summary>

1. Download the [vehicle-info-card.js](https://github.com/ngocjohn/vehicle-info-card/releases/latest).

2. Place the downloaded file on your Home Assistant machine in the `config/www` folder (when there is no `www` folder in the folder where your `configuration.yaml` file is, create it and place the file there).
3. In Home Assistant go to `Configuration->Lovelace Dashboards->Resources` (When there is no `resources` tag on the `Lovelace Dashboard` page, enable advanced mode in your account settings, and retry this step).
4. Add a new resource:

   - Url = `/local/vehicle-info-card.js`
   - Resource type = `module`

5. Force refresh the Home Assistant page `Ctrl` + `F5` / `Shift` + `⌘` + `R`.
6. Add vehicle-info-card to your page.

</details>

## Configuration

<p style="text-align: justify;">Basic options can be configured in the GUI editor. This card also offers optional advanced features for enhanced customization. You can enable a slideshow to display images of your car, with the ability to swipe sideways to navigate between images. The images can be uploaded directly to HA instance within editor. Additionally, you can display the car's position on a map along with the generated address.</p>

> [!TIP]
> For the best quality images of your vehicle, use the [Mercedes-Benz API service](https://developer.mercedes-benz.com/products/vehicle_images/docs#) to download them. You can find the Python script for downloading images [here](https://gist.github.com/ngocjohn/b1c1f3730cc6f7079ae0d2b3bddd57ad).

<p align="center">
  <a href="./assets/card-ui-editor.gif">
    <img src="https://raw.githubusercontent.com/ngocjohn/vehicle-info-card/main/assets/card-ui-editor.gif" alt="Card UI Editor">
  </a>
</p>

### Options

<details>
  <summary>Below is the basic configuration for the custom card </summary>

| Name                      | Type        | Requirement | Description                                                                                                                                                                                                                   |
| ------------------------- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string      | Required    | `custom:vehicle-info-card`.                                                                                                                                                                                                   |
| `entity`                  | string      | Required    | The entity ID of the car sensor, e.g., `sensor.license_plate_car`.                                                                                                                                                            |
| `name`                    | string      | Optional    | The name to be displayed on the card. Default is vehicle model name.                                                                                                                                                          |
| `device_tracker`          | string      | Optional    | The entity ID of the device tracker for map display.                                                                                                                                                                          |
| `google_api_key`          | string      | Optional    | Google Maps API key for generating address from coordinates. Default is using OpenStreetMap service.                                                                                                                          |
| `selected_language`       | string      | Optional    | Language options. Default `en`                                                                                                                                                                                                |
| `show_slides`             | boolean     | Optional    | Set to `true` to enable slideshow of car images. Default is `false`.                                                                                                                                                          |
| `show_map`                | boolean     | Optional    | Set to `true` to display the car's position on a map. Default is `false`.                                                                                                                                                     |
| `show_buttons`            | boolean     | Optional    | Set to `true` to show the buttons. Default is `true`.                                                                                                                                                                         |
| `show_background`         | boolean     | Optional    | Set to `true` to show a background image. Default is `true`.                                                                                                                                                                  |
| `enable_map_popup`        | boolean     | Optional    | Set to `true` to enable map popup function. Default is `false`.                                                                                                                                                               |
| `enable_services_control` | boolean     | Optional    | Set to `true` to enable remote control tab. Default is `false`.                                                                                                                                                               |
| `map_popup_config`        | object      | Optional    | Configuration including `theme_mode` to control the map’s appearance (`light` `dark` `auto`), `hours_to_show` to specify the number of hours of data to display, and `default_zoom` to set the initial zoom level of the map. |
| `images`                  | list        | Optional    | List of image URLs or Paths from config/www folder for the slideshow. Images render better with a transparent background and a maximum width of 500px to fit the card.                                                        |
| `trip_card`               | object list | Optional    | Configuration objects for the trip card.                                                                                                                                                                                      |
| `vehicle_card`            | object list | Optional    | Configuration objects for the vehicle card.                                                                                                                                                                                   |
| `eco_card`                | object list | Optional    | Configuration objects for the eco display card.                                                                                                                                                                               |
| `tyre_card`               | object list | Optional    | Configuration objects for the tire pressure card.                                                                                                                                                                             |
| `services`                | object list | Optional    | Configure the available services for the integration. [Here](#services-configuration) are the available services that can be enabled or disabled.                                                                             |

</details>

### Services configuration

> [!NOTE]
> Some services require that the security PIN is created in your mobile Android/IOS app. Please store the pin in the options dialog of the integration. <a href="https://github.com/ReneNulschDE/mbapi2020?tab=readme-ov-file#services">More info</a>

<details>
  <summary>Services configuration</summary>

| Service     | Description                                    |
| ----------- | ---------------------------------------------- |
| `charge`    | Manage the charging process.                   |
| `auxheat`   | Control the auxiliary heating.                 |
| `doorsLock` | Lock the car doors.                            |
| `preheat`   | Control the preheating for zero emission cars. |
| `sigPos`    | Start light signaling.                         |
| `sunroof`   | Control the sunroof (open, tilt, close).       |
| `sendRoute` | Send a route to the car.                       |
| `engine`    | Control the engine (start, stop).              |
| `windows`   | Control the windows (open, close, move).       |

</details>

<details>
<summary> Yaml configuration </summary>

```yaml
services:
  charge: true
  auxheat: true
  doorsLock: true
  preheat: true
  sigPos: true
  sunroof: true
  sendRoute: true
  engine: true
  windows: true
```

</details>

### Examples

Below is the configuration replaced entities card for `Vehicle status` button.

> [!TIP]
> For an enhanced picture elements card, refer to [this tutorial](https://community.home-assistant.io/t/mercedes-me-component/41911/1809) on the Home Assistant forum. Use downloaded images with the new version of the component for the best results.

<details>

<summary>Yaml configuration</summary>

```yaml
- type: custom:vehicle-info-card
  entity: sensor.6z1_2359_car
  name: Mercedes-AMG E 43 4MATIC
  device_tracker: device_tracker.demo_paulus
  show_map: true
  show_slides: true
  show_buttons: true
  show_background: true
  enable_map_popup: false
  images:
    - /local/benz/benz-1.png
    - /local/benz/benz-2.png
    - /local/benz/benz-3.png
    - /local/benz/benz-4.png
    - /local/benz/benz-5.png
  vehicle_card:
    - type: entities
      show_header_toggle: false
      state_color: true
      title: Vehicle status
      entities:
        - entity: lock.6z1_2359_lock
        - entity: binary_sensor.6z1_2359_park_brake_status
        - entity: binary_sensor.6z1_2359_tire_warning
        - entity: binary_sensor.6z1_2359_low_brake_fluid_warning
        - entity: binary_sensor.6z1_2359_low_coolant_level_warning
        - entity: binary_sensor.6z1_2359_engine_light_warning
        - entity: binary_sensor.6z1_2359_low_wash_water_warning
```

<img src="https://raw.githubusercontent.com/ngocjohn/vehicle-info-card/main/assets/card-example-editor.png">

</details>

## Screenshots

<img src="https://raw.githubusercontent.com/ngocjohn/vehicle-info-card/main/assets/card-dark.png" />
<img src="https://raw.githubusercontent.com/ngocjohn/vehicle-info-card/main/assets/card-light.png" />
<img src="https://raw.githubusercontent.com/ngocjohn/vehicle-info-card/main/assets/sub-cards.png" />

<details>
  <summary> More screenshots </summary>
    <img src="https://raw.githubusercontent.com/ngocjohn/vehicle-info-card/main/assets/card-toggled.png" />
    <img src="https://raw.githubusercontent.com/ngocjohn/vehicle-info-card/main/assets/car-custom-card-warning.png">
    <img src="https://raw.githubusercontent.com/ngocjohn/vehicle-info-card/main/assets/car-custom-card.png">
</details>

## Contribution Guidelines

We welcome contributions and are grateful for your support in improving this project. If you'd like to contribute, please follow our [Contribution Guidelines](docs/CONTRIBUTING.md) to get started.

---

2024 Viet Ngoc

[https://github.com/ngocjohn/](https://github.com/ngocjohn/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
