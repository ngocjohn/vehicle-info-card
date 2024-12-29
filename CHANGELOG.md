<a id="v1.6.1"></a>
# [v1.6.1](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.6.1) - 2024-12-29

<!-- Release notes generated using configuration in .github/release.yml at v1.6.1 -->

## What's Changed
This release introduces exciting new features, including section order customization, enhanced map functionality with address display, and support for picture templates in button configurations. Additionally, it includes key improvements to map tile handling, a redesigned map popup, and updated French translations for a more localized experience.

If you find this card helpful, please consider giving the repository a ⭐! 

## 🎉 New Features
- **Target Temperature and Preconditioning Configuration**:  
  Added services for configuring target temperature (preconditioning/auxiliary heating) and preconditioning seat settings. [#89](https://github.com/ngocjohn/vehicle-info-card/pull/89)
- **Section Order Customization**:  
  Introduced the ability to define the order of sections in the card, providing greater flexibility in customizing the layout.
- **Show Address on Mini Map**:  
  Added an option to display the address directly on the mini map for enhanced usability.
- **Picture Template for Buttons**:  
  Added support for a picture template, allowing users to use custom images instead of icons in button configurations.

![benz-section-order2](https://github.com/user-attachments/assets/610bd5e8-1ddb-4be2-a34c-acceb4efb439)
![benz-section](https://github.com/user-attachments/assets/af1ca788-0a00-45e4-9f84-19c9d7a44c08)
![benz-map-anim](https://github.com/user-attachments/assets/db730a3e-9d76-49d6-a0c5-39e2ca0c04e6)


## 🛠️ Improvements
- **Map Tile Provider Fixes**:  
  Resolved issues with map tile providers. [#99](https://github.com/ngocjohn/vehicle-info-card/pull/99)
- **Map Popup Redesign**:  
  Changed the map popup functionality from an in-card display to a dialog for improved usability and better integration with Home Assistant's UI.


## 🌍 Translations
- **French Translation Update**:  
  Improved French translations for a more localized experience. Thanks to [@Joebar16](https://github.com/Joebar16)! [#95](https://github.com/ngocjohn/vehicle-info-card/pull/95)

## 📦 Other Changes
- **Dependency Updates**:  
  Updated `eslint-plugin-perfectionist` from `v3.9.1` to `v4.3.0` for improved code linting and development tooling. [#97](https://github.com/ngocjohn/vehicle-info-card/pull/97)


Enjoy the new features and improvements! 🚀

**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.6.0...v1.6.1

[Changes][v1.6.1]


<a id="v1.6.0"></a>
# [v1.6.0](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.6.0) - 2024-11-27

<!-- Release notes generated using configuration in .github/release.yml at v1.6.0 -->

## What's Changed
### Fixes 🐛
* Fix: Render Template Subscription for Non-Admin Users by [@ngocjohn](https://github.com/ngocjohn) in [#87](https://github.com/ngocjohn/vehicle-info-card/pull/87)
### Translations 🌍
* Add spanish translation by [@ivangarrera](https://github.com/ivangarrera) in [#76](https://github.com/ngocjohn/vehicle-info-card/pull/76)
* Dutch translation added by [@jhuskens](https://github.com/jhuskens) in [#83](https://github.com/ngocjohn/vehicle-info-card/pull/83)
### Other Changes
* Updated readme to reflect required url property in images by [@silashansen](https://github.com/silashansen) in [#81](https://github.com/ngocjohn/vehicle-info-card/pull/81)
* chore(deps-dev): bump apexcharts from 3.54.1 to 4.0.0 by [@dependabot](https://github.com/dependabot) in [#79](https://github.com/ngocjohn/vehicle-info-card/pull/79)

## New Contributors
* [@ivangarrera](https://github.com/ivangarrera) made their first contribution in [#76](https://github.com/ngocjohn/vehicle-info-card/pull/76)
* [@silashansen](https://github.com/silashansen) made their first contribution in [#81](https://github.com/ngocjohn/vehicle-info-card/pull/81)
* [@jhuskens](https://github.com/jhuskens) made their first contribution in [#83](https://github.com/ngocjohn/vehicle-info-card/pull/83)

**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.5.0...v1.6.0

[Changes][v1.6.0]


<a id="v1.5.0"></a>
# [v1.5.0](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.5.0) - 2024-10-21

<!-- Release notes generated using configuration in .github/release.yml at v1.5.0 -->

## What's Changed
### New Features 🎉
* **Create Card Using Editor UI** in [#74](https://github.com/ngocjohn/vehicle-info-card/pull/74)

Now you can easily create and customize cards directly through the **Editor UI**, enhancing the user experience by providing a more intuitive interface for card configuration. This feature simplifies the process of card creation, making it accessible without requiring manual code changes.

![custom-card-ui](https://github.com/user-attachments/assets/cd3fc637-105d-41a8-b683-4ae65ba71117)

### Other Changes
* Swap up/down icons for windows by [@mrspouse](https://github.com/mrspouse) in [#70](https://github.com/ngocjohn/vehicle-info-card/pull/70)
* Refactor VehicleMap component to fetch address from attributes by [@ngocjohn](https://github.com/ngocjohn) in [#75](https://github.com/ngocjohn/vehicle-info-card/pull/75)


**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.4.0...v1.5.0

[Changes][v1.5.0]


<a id="v1.4.0"></a>
# [v1.4.0](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.4.0) - 2024-09-30

<!-- Release notes generated using configuration in .github/release.yml at v1.4.0 -->

## What's Changed
This release brings enhanced customization options with drag-and-drop image uploads, the ability to change tire backgrounds, and improved image slide configurations. It also includes crucial fixes for button assignment issues and better handling of hass state updates in custom cards, ensuring smoother functionality and user experience.

![tire-card-custom](https://github.com/user-attachments/assets/ce326c5f-a8de-4b69-aa44-300c835ddf52)

### New Features 🎉
* Feat: Add drag-drop upload images in [#63](https://github.com/ngocjohn/vehicle-info-card/pull/63)
* Feat: Add the option to change the tire background.  in [#64](https://github.com/ngocjohn/vehicle-info-card/pull/64)
* Feat:  Tire card customization & Image slides configuration  in [#69](https://github.com/ngocjohn/vehicle-info-card/pull/69)
### Fixes 🐛
* Fix: Button not asign to card.  in [#62](https://github.com/ngocjohn/vehicle-info-card/pull/62)
* Fix: hass State Update Handling in Custom Cards  in [#68](https://github.com/ngocjohn/vehicle-info-card/pull/68)
### Translations 🌍
* Add Italian language  by [@RiccardoCalvi](https://github.com/RiccardoCalvi) in [#61](https://github.com/ngocjohn/vehicle-info-card/pull/61)
### Other Changes
* chore(deps): bump @rollup/plugin-typescript from 11.1.6 to 12.1.0 by [@dependabot](https://github.com/dependabot) in [#66](https://github.com/ngocjohn/vehicle-info-card/pull/66)
* chore(deps-dev): bump @rollup/plugin-replace from 5.0.7 to 6.0.1 by [@dependabot](https://github.com/dependabot) in [#67](https://github.com/ngocjohn/vehicle-info-card/pull/67)

## New Contributors
* [@RiccardoCalvi](https://github.com/RiccardoCalvi) made their first contribution in [#61](https://github.com/ngocjohn/vehicle-info-card/pull/61)

**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.3.1...v1.4.0

[Changes][v1.4.0]


<a id="v1.3.1"></a>
# [v1.3.1](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.3.1) - 2024-09-09

<!-- Release notes generated using configuration in .github/release.yml at v1.3.1 -->

## What's Changed
### Fixes 🐛
* FIX: Sunroof state display  by [@ngocjohn](https://github.com/ngocjohn) in [#57](https://github.com/ngocjohn/vehicle-info-card/pull/57)


**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.3.0...v1.3.1

[Changes][v1.3.1]


<a id="v1.3.0"></a>
# [v1.3.0](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.3.0) - 2024-09-07

<!-- Release notes generated using configuration in .github/release.yml at v1.3.0 -->

## What's Changed
The latest update introduces exciting new possibilities for button customization!

### New Features 🎉

- **Unlimited Button Creation**: It’s now possible to create entirely new buttons and add them to cards, with no limit on the number of buttons.
- **Full UI Customization**: Customize tabs and buttons completely through the user interface—no coding required.
- **Swipe Feature for Buttons**: A new swipe feature allows configuration of how many rows of buttons appear per slide, offering greater flexibility in layout.


* Feat: New swipe functionality to navigate through button grids, with configurable rows per slide. by [@ngocjohn](https://github.com/ngocjohn) in [#55](https://github.com/ngocjohn/vehicle-info-card/pull/55)
### Translations 🌍
* Update fr.json with the last change by [@Joebar16](https://github.com/Joebar16) in [#54](https://github.com/ngocjohn/vehicle-info-card/pull/54)
### Other Changes
* Add card preview functionality for custom buttons and cards. by [@ngocjohn](https://github.com/ngocjohn) in [#53](https://github.com/ngocjohn/vehicle-info-card/pull/53)

![button-grid-swipe](https://github.com/user-attachments/assets/b508e55c-5cd8-4273-98ca-21640a4cee71)


If you enjoy these new features, please consider giving the repository a star ⭐ 

**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.2.0...v1.3.0

[Changes][v1.3.0]


<a id="v1.2.0"></a>
# [v1.2.0](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.2.0) - 2024-08-29

## What's Changed

This update introduces language localization improvements, enhanced styling for range info and hybrid car support, new features for zero-emission vehicles, charge flap status tracking, and customizable button options. If you’re enjoying this card, please consider giving it a star on the repository!  ⭐ 

- **Tyre to Tire Conversion**: Changed "Tyre" to "Tire" for `en` localization to match American English conventions. [#41](https://github.com/ngocjohn/vehicle-info-card/pull/41)
- **Range Info Bar & Hybrid Car Support**: Updated range info bar styling and added support for hybrid vehicles. [#44](https://github.com/ngocjohn/vehicle-info-card/pull/44)
- **Zero-Emission Distance Sensors**: Added support for zero-emission distance sensors to enhance monitoring for electric vehicles. [#45](https://github.com/ngocjohn/vehicle-info-card/pull/45)
- **Charge Flap DC Status**: Included charge flap DC status in door attributes for better tracking of charging infrastructure. [#48](https://github.com/ngocjohn/vehicle-info-card/pull/48)
- **Customizable Buttons**: Introduced options to customize buttons for a more personalized user interface. [#49](https://github.com/ngocjohn/vehicle-info-card/pull/49)

![range-info-hev](https://github.com/user-attachments/assets/ceaab202-5315-4b3e-b5ec-c763d943fef8)
![custom-btn-config](https://github.com/user-attachments/assets/6edfa176-c19e-4b24-9ceb-163a7bf05573)

## New Contributors
* [@rbollar](https://github.com/rbollar) made their first contribution in [#41](https://github.com/ngocjohn/vehicle-info-card/pull/41)

**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.1.2...v1.2.0

[Changes][v1.2.0]


<a id="v1.1.2"></a>
# [v1.1.2](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.1.2) - 2024-08-14

## What's Changed

- **French Language Support**: Added French translation (fr.json) by [@Joebar16](https://github.com/Joebar16) in [PR #33](https://github.com/ngocjohn/vehicle-info-card/pull/33).
- **British English Updates**: Improved spelling and descriptions in British English (en_GB) by [@mrspouse](https://github.com/mrspouse) in [PR #39](https://github.com/ngocjohn/vehicle-info-card/pull/39).
- **Name Selector Option**: Introduced a new selector that allows users to choose between displaying the model name or a custom name on the card by [@ngocjohn](https://github.com/ngocjohn) in [PR #34](https://github.com/ngocjohn/vehicle-info-card/pull/34).
- **Enhanced File Upload**: Improved functionality for uploading multiple files by [@ngocjohn](https://github.com/ngocjohn) in [PR #35](https://github.com/ngocjohn/vehicle-info-card/pull/35).
- **Image Sorting**: Added drag-and-drop functionality for sorting images by [@ngocjohn](https://github.com/ngocjohn) in [PR #40](https://github.com/ngocjohn/vehicle-info-card/pull/40).

![multi-upload-drag](https://github.com/user-attachments/assets/71576a9c-baa4-4735-84cd-cfdeadc9eb34)
![tyre-rotate](https://github.com/user-attachments/assets/45e127cb-2546-47bd-a346-d29d6b664d34)

## New Contributors

- **[@Joebar16](https://github.com/Joebar16)** made their first contribution in [PR #33](https://github.com/ngocjohn/vehicle-info-card/pull/33).
- **[@mrspouse](https://github.com/mrspouse)** made their first contribution in [PR #39](https://github.com/ngocjohn/vehicle-info-card/pull/39).

**Full Changelog**: [v1.1.1...v1.1.2](https://github.com/ngocjohn/vehicle-info-card/compare/v1.1.1...v1.1.2)

[Changes][v1.1.2]


<a id="v1.1.1"></a>
# [v1.1.1](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.1.1) - 2024-08-09

## What's Changed

### Update
* Added `Lithuanian (lt.json)` translation by [@andiukas](https://github.com/andiukas) in [#32](https://github.com/ngocjohn/vehicle-info-card/pull/32)

### Maintenance
* Update CSS parameters for adaptation of new version HA 2024.8 
* Remove engine light warning and filter device entities based on availability in [#26](https://github.com/ngocjohn/vehicle-info-card/pull/26)

## New Contributors
* [@andiukas](https://github.com/andiukas) made their first contribution in [#32](https://github.com/ngocjohn/vehicle-info-card/pull/32)

We encourage new contributors, especially for localization translations; please refer to our [Contributing Guidelines](https://github.com/ngocjohn/vehicle-info-card/blob/main/docs/CONTRIBUTING.md) to get started.

**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.1.0...v1.1.1

[Changes][v1.1.1]


<a id="v1.1.0"></a>
# [v1.1.0](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.1.0) - 2024-08-02

## What's Changed
This update brings significant new features and improvements to enhance user experience and functionality.

### New Features:
- **Language Localization Support:** Added comprehensive support for localization across the card, enabling users to see translated strings based on their selected language. [#22](https://github.com/ngocjohn/vehicle-info-card/pull/22) New pull requests (PRs) for additional translations are welcome. 🙏  
  
   **Supported Languages:** The card now supports the following languages:
    - English (en) ` Default `
    - Czech (cs)
    - German (de)
    - Polish (pl)
    - Slovak (sk)
    - Vietnamese (vi)

- **Image Upload Integration:** Users can now upload images directly within the editor interface. [#25](https://github.com/ngocjohn/vehicle-info-card/pull/25)

![image-upload-feat](https://github.com/user-attachments/assets/063eee20-5fcc-4652-87b5-c226c4c4e665)

**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.7...v1.1.0

[Changes][v1.1.0]


<a id="v1.0.7"></a>
# [v1.0.7](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.0.7) - 2024-07-24

## What's Changed
* Update: auxheat and pre-conditioning updated to Hour:Minute input format by [@ngocjohn](https://github.com/ngocjohn) in [#18](https://github.com/ngocjohn/vehicle-info-card/pull/18)
- Add error notification feature by [@ngocjohn](https://github.com/ngocjohn) in [#19](https://github.com/ngocjohn/vehicle-info-card/pull/19)
    - The error notifications will be shown for specific card types based on the presence of warnings or other conditions. The feature can be enabled or disabled through the card editor.

**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.6...v1.0.7

[Changes][v1.0.7]


<a id="v1.0.6"></a>
# [v1.0.6](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.0.6) - 2024-07-08

## What's Changed

This update focuses on enhancing the visual aspects of the card and includes minor changes in the editor to improve user experience.

### Features
- **Theme Picker:** Added a new option to select a theme for the card. Users can now set the theme independently of system settings, providing more flexibility and customization.

![output](https://github.com/ngocjohn/vehicle-info-card/assets/96962827/192c7560-c04e-42b7-bb25-244245572102)

### Updates

- **Trip Info Card:** Added two new statuses to the trip info card:
  - **Driving Time from Reset:** Displays the driving time since the last reset.
  - **Driving Time from Start:** Shows the driving time from the start of the trip.

___

* Add theme support to card by [@ngocjohn](https://github.com/ngocjohn) in [#16](https://github.com/ngocjohn/vehicle-info-card/pull/16)
* Update wrap the show options to collapsed element by [@ngocjohn](https://github.com/ngocjohn) in [#17](https://github.com/ngocjohn/vehicle-info-card/pull/17)


**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.5...v1.0.6

[Changes][v1.0.6]


<a id="v1.0.5"></a>
# [v1.0.5](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.0.5) - 2024-07-01

- This update features a new remote control card with customizable services, enhanced trip card with AdBlue level info, and improved tire pressure display. Enjoy a more streamlined interface and better control options.
---
### Features:

- **New Remote Control Card**:
  - Introduced a new remote control card encompassing all available services offered by the integration.
  - This feature can be activated in the editor, allowing customization of which services are displayed on the tab.
  - Once activated, a new 'services' indicator will appear in the tab header, guiding you to the control tab.
  - Each service is represented by its own button, providing further configurations specific to that service.
  - For each service, the VIN/FIN is automatically set from the car entity ID.
	

### Updates:

- **Trip Card Enhancement**:
  - Added the AdBlue level to the trip card status summary for more comprehensive trip information. [#13](https://github.com/ngocjohn/vehicle-info-card/issues/13) 
- **Tire Pressures Tab Update**:
  - Changed the display of the tire pressures tab. Now, the background of the car and the tire data are displayed for the specific tires.
  - 
![v105_release](https://github.com/ngocjohn/vehicle-info-card/assets/96962827/51c94ce4-a7e7-41d3-a3df-983f9ebe7c15)


[Changes][v1.0.5]


<a id="v1.0.4"></a>
# [v1.0.4](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.0.4) - 2024-06-20

This update enhances the usability and accuracy of our custom card, providing clearer setup options and more detailed status information, along with important bug fixes for better performance and reliability.

---

### Changes
- **Sub Card Setup via UI**: Added a new function to set up individual sub cards through the user interface for improved clarity and user experience.
- **Enhanced Status Information**: Added more detailed status information for windows and doors, including the number of open doors or windows.
- **New Sensors**: Added new sensors for the starter battery and ignition, and updated to display their values for better monitoring and management.

### Repairs
- **Charge Power Status Display**: Fixed the issue with the charge power status display to show values accurately to two decimal places.
- **State of Charge Indicator Icons**: Corrected the display of icons for the state of charge indicator, ensuring they reflect the accurate state.


![releaseanimation](https://github.com/ngocjohn/vehicle-info-card/assets/96962827/1ff75f55-c6c4-4078-b1c5-f0c082d0f185)

![v104-sensors](https://github.com/ngocjohn/vehicle-info-card/assets/96962827/31a27e6b-e2ba-4196-8f89-9ca56cd99077)


[Changes][v1.0.4]


<a id="v1.0.3"></a>
# [v1.0.3](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.0.3) - 2024-06-15

### Features:
- **Charge Indicator for Electric Vehicles**:  This indicator provides essential details including the charge power, current battery status, maximum set charge status, and the selected charging program. This enhancement offers clear and comprehensive insights into the charging process. [#1](https://github.com/ngocjohn/vehicle-info-card/issues/1) 

### Changes:
- **Map Popup Settings in UI**: Added a new setting option to the User Interface for configuring basic map settings. This includes parameters such as default zoom level, the number of hours to display, and the theme mode. These settings can now be adjusted directly from the UI.
- **Slide Images URL in UI Editor**: Introduced the ability to insert slide images URLs directly within the UI editor. This enhancement improves the efficiency and flexibility of the UI editing process.

![added-charging-indicator](https://github.com/ngocjohn/vehicle-info-card/assets/96962827/c6ef06e7-5812-4c52-93b2-b91c98814b58)


**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.2...v1.0.3

[Changes][v1.0.3]


<a id="v1.0.2"></a>
# [v1.0.2](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.0.2) - 2024-06-09

### Features

- **Eco Score Chart**: Added an eco score chart for Eco display card.
- **Additional Display Attributes**: Included additional display attributes for `sensor.lock` in Vehicle status card.

### Fixes

- **State of Charge Display**: Fixed the correct display of state of charge values for electric vehicles.

![v102](https://github.com/ngocjohn/vehicle-info-card/assets/96962827/8c96d721-922c-4be1-a566-b0b7cc2cd22e)
**Full Changelog**: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.1...v1.0.2

[Changes][v1.0.2]


<a id="v1.0.1"></a>
# [v1.0.1](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.0.1) - 2024-06-06

# What's Changed
### Features

- **Swipe Between Cards**: Introduced functionality to swipe between cards for a more intuitive navigation experience.
- **Map Integration**: Added a feature to display the map as a new card when clicking on a marker, enhancing interaction with map elements.
- **Electric Vehicle Sensors**: Incorporated new sensors specifically for electric vehicles, providing more detailed and relevant data.

### Fixes

- **Unit of Measurement Display**: Corrected the display of units of measurement to ensure accuracy and consistency.
- **Card Order**: Adjusted the order of cards to reflect the correct sequence.

  
![swipe-card](https://github.com/ngocjohn/vehicle-info-card/assets/96962827/c550c09c-464a-4fff-9987-4d8ad11d5451)



[Changes][v1.0.1]


<a id="v1.0.0"></a>
# [v1.0.0](https://github.com/ngocjohn/vehicle-info-card/releases/tag/v1.0.0) - 2024-06-05



[Changes][v1.0.0]


[v1.6.1]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.6.0...v1.6.1
[v1.6.0]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.5.0...v1.6.0
[v1.5.0]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.4.0...v1.5.0
[v1.4.0]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.3.1...v1.4.0
[v1.3.1]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.3.0...v1.3.1
[v1.3.0]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.2.0...v1.3.0
[v1.2.0]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.1.2...v1.2.0
[v1.1.2]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.1.1...v1.1.2
[v1.1.1]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.1.0...v1.1.1
[v1.1.0]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.7...v1.1.0
[v1.0.7]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.6...v1.0.7
[v1.0.6]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.5...v1.0.6
[v1.0.5]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.4...v1.0.5
[v1.0.4]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.3...v1.0.4
[v1.0.3]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.2...v1.0.3
[v1.0.2]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.1...v1.0.2
[v1.0.1]: https://github.com/ngocjohn/vehicle-info-card/compare/v1.0.0...v1.0.1
[v1.0.0]: https://github.com/ngocjohn/vehicle-info-card/tree/v1.0.0

<!-- Generated by https://github.com/rhysd/changelog-from-release v3.8.1 -->
