/* eslint-disable @typescript-eslint/no-explicit-any */

import { fireEvent } from 'custom-card-helpers';
import { debounce } from 'es-toolkit';
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import Sortable from 'sortablejs';

import { VehicleCardEditor } from '../../editor';
import { ImageConfig, VehicleCardConfig } from '../../types';
import { imageInputChange, handleFilePicked } from '../../utils/editor-image-handler';
import { Picker } from '../../utils/create';

import editorcss from '../../css/editor.css';

@customElement('panel-images')
export class PanelImages extends LitElement {
  @property({ attribute: false }) editor!: VehicleCardEditor;
  @property({ type: Object }) config!: VehicleCardConfig;
  @property({ type: Array }) _images!: ImageConfig[];
  @state() _selectedItems: Set<string> = new Set();
  @state() _newImageUrl: string = '';
  @state() _sortable: Sortable | null = null;
  @state() _reindexImages: boolean = false;
  @property({ type: Boolean }) isDragging = false;

  static get styles(): CSSResultGroup {
    return [
      editorcss,
      css`
        .hidden {
          display: none;
        }
        #drop-area {
          margin-block: var(--vic-card-padding);
          border-block: 1px solid var(--divider-color);
        }

        .drop-area {
          border: 2px dashed var(--divider-color);
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: background-color 0.3s;
          margin-block: var(--vic-card-padding);
        }

        .drop-area[dragging] {
          background-color: rgba(var(--rgb-primary-text-color), 0.05);
        }

        input[type='file'] {
          display: none;
        }

        .new-image-url > ha-textfield {
          width: 100%;
        }
      `,
    ];
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (_changedProperties.has('config')) {
      this._images = this.config.images;
      return true;
    }
    return true;
  }

  private _debouncedConfigChanged = debounce(this._configChanged.bind(this), 300);

  private _renderUploadAddNewImage(): TemplateResult {
    const urlInput = html`
      <div class="custom-background-wrapper">
        <ha-button @click=${() => this.toggleUpload()} id="upload-btn">
          ${this.editor.hass.localize('ui.components.selectors.image.upload')}
        </ha-button>
        <ha-button @click=${() => this.toggleSwiperConfig()} id="swiper-btn"> Swiper Config </ha-button>
      </div>
    `;
    return urlInput;
  }

  private _renderSwiperConfig(): TemplateResult {
    const image = this.config?.extra_configs?.images_swipe || {};
    const sharedConfig = {
      component: this,
      configType: 'images_swipe',
    };

    const swiperConfig = [
      {
        value: image.max_height || 150,
        configValue: 'max_height',
        label: 'Max Height (px)',
        options: { selector: { number: { min: 100, max: 500, mode: 'slider', step: 1 } } },
        pickerType: 'number' as 'number',
      },
      {
        value: image.max_width || 450,
        configValue: 'max_width',
        label: 'Max Width (px)',
        options: { selector: { number: { min: 100, max: 500, mode: 'slider', step: 1 } } },
        pickerType: 'number' as 'number',
      },

      {
        value: image.delay || 3000,
        configValue: 'delay',
        label: 'Delay (ms)',
        options: { selector: { number: { min: 500, max: 10000, mode: 'slider', step: 50 } } },
        pickerType: 'number' as 'number',
      },
      {
        value: image.speed || 500,
        configValue: 'speed',
        label: 'Speed (ms)',
        options: { selector: { number: { min: 100, max: 5000, mode: 'slider', step: 50 } } },
        pickerType: 'number' as 'number',
      },
      {
        value: image.effect || 'slide',
        configValue: 'effect',
        label: 'Effect',
        items: [
          {
            value: 'slide',
            label: 'Slide',
          },
          {
            value: 'fade',
            label: 'Fade',
          },
          {
            value: 'coverflow',
            label: 'Coverflow',
          },
        ],
        pickerType: 'attribute' as 'attribute',
      },
    ];
    const swiperBooleanConfig = [
      {
        value: image.autoplay || false,
        configValue: 'autoplay',
        label: 'Autoplay',
        pickerType: 'selectorBoolean' as 'selectorBoolean',
      },
      {
        value: image.loop || true,
        configValue: 'loop',
        label: 'Loop',
        pickerType: 'selectorBoolean' as 'selectorBoolean',
      },
    ];

    return html` <div id="image-swiper-config" style="display: none;">
      <div>
        <div>Slide layout configuration</div>
      </div>
      <div>
        <div>${swiperConfig.map((config) => this.generateItemPicker({ ...config, ...sharedConfig }))}</div>
      </div>
      <div>${swiperBooleanConfig.map((config) => this.generateItemPicker({ ...config, ...sharedConfig }))}</div>
    </div>`;
  }

  private _imageList(): TemplateResult {
    if (this._reindexImages) {
      return html`<span>Loading...</span>`;
    }
    const selectAction = {
      label:
        this._selectedItems.size === 0
          ? this.editor.localize('editor.imagesConfig.selectAll')
          : this.editor.localize('editor.imagesConfig.deselectAll'),
      action: this._selectedItems.size === 0 ? this._selectAll : this._deselectAllItems,
    };
    const deleteButton =
      this._selectedItems.size > 0
        ? html`
            <ha-button @click=${this._deleteSelectedItems}>
              ${this.editor.localize('editor.imagesConfig.deleteSelected')}
            </ha-button>
          `
        : '';

    const showIndexDeleteBtn =
      this.config.images && this.config.images.length > 0
        ? html`
            <div class="custom-background-wrapper">
              <ha-formfield .label=${'Show Image Index'}>
                <ha-switch
                  .checked=${this.config.show_image_index}
                  .configValue=${'show_image_index'}
                  @change=${(ev: Event) => this.editor._valueChanged(ev)}
                ></ha-switch>
              </ha-formfield>
              <ha-button @click=${selectAction.action}>${selectAction.label}</ha-button>
              ${deleteButton}
            </div>
          `
        : '';

    const dropArea = this._renderDropArea();
    const imageList = html`<div class="images-list" id="images-list">
      ${repeat(
        this._images || [],
        (image) => image.url,
        (image, index) =>
          html`<div class="custom-background-wrapper" data-url="${image.url}">
            <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
            <ha-textfield
              class="image-input"
              .label=${'IMAGE URL'}
              .configValue=${'images'}
              .value=${image.title}
              @input=${(event: Event) => imageInputChange(this.editor, event, index)}
            ></ha-textfield>
            <ha-checkbox .checked=${false} @change=${(ev: Event) => this._toggleSelection(ev, image.url)}></ha-checkbox>
          </div>`
      )}
      ${showIndexDeleteBtn}
    </div>`;

    return html`${dropArea}${imageList}`;
  }

  private _renderDropArea(): TemplateResult {
    const errorMsg = this.editor.localize('card.common.toastImageError');

    return html`
      <div id="drop-area" style="display: none;">
        <div
          class="drop-area"
          ?dragging=${this.isDragging}
          @dragover=${this._handleDragOver}
          @dragleave=${this._handleDragLeave}
          @drop=${this._handleDrop}
          @click=${() => this.shadowRoot?.getElementById('file-upload-new')?.click()}
        >
          <span>Drag & drop files here or click to select files</span>
          <p>Supports JPEG, PNG, or GIF image.</p>

          <input
            type="file"
            id="file-upload-new"
            class="file-input"
            .errorMsg=${errorMsg}
            .toastId="${`imagesConfig`}"
            @change=${(ev: any) => handleFilePicked(this.editor, ev)}
            accept="image/*"
            multiple
          />
        </div>
        <div class="custom-background-wrapper">
          <ha-textfield
            .label=${this.editor.hass.localize('ui.components.selectors.image.url')}
            .configValue=${'new_image_url'}
            .value=${this._newImageUrl}
            @input=${this.toggleAddButton}
          ></ha-textfield>
          <div class="new-url-btn">
            <ha-icon icon="mdi:plus" @click=${() => this.addNewImageUrl()}></ha-icon>
          </div>
        </div>
      </div>
    `;
  }

  protected render(): TemplateResult {
    const imageList = this._imageList();
    const addNewImage = this._renderUploadAddNewImage();
    const swiperConfig = this._renderSwiperConfig();

    const content = html`${imageList}${addNewImage} ${swiperConfig}`;

    return content;
  }

  private _configChanged(): void {
    fireEvent(this.editor, 'config-changed', { config: this.config });
  }

  private toggleSwiperConfig(): void {
    const swiperConfig = this.shadowRoot?.getElementById('image-swiper-config') as HTMLElement;
    const imageList = this.shadowRoot?.getElementById('images-list') as HTMLElement;
    const swiperBtn = this.shadowRoot?.getElementById('swiper-btn') as HTMLElement;
    const uploadBtn = this.shadowRoot?.getElementById('upload-btn') as HTMLElement;
    const isHidden = swiperConfig?.style.display === 'none';
    if (isHidden) {
      swiperConfig.style.display = 'block';
      imageList.style.display = 'none';
      uploadBtn.style.visibility = 'hidden';
      swiperBtn.innerHTML = 'Cancel';
    } else {
      swiperConfig.style.display = 'none';
      uploadBtn.style.visibility = 'visible';
      imageList.style.display = 'block';
      swiperBtn.innerHTML = 'Swiper Config';
    }
  }

  private toggleUpload(): void {
    const dropArea = this.shadowRoot?.getElementById('drop-area') as HTMLElement;
    const imageList = this.shadowRoot?.getElementById('images-list') as HTMLElement;
    const addImageBtn = this.shadowRoot?.getElementById('upload-btn') as HTMLElement;
    const isHidden = dropArea?.style.display === 'none';
    if (isHidden) {
      dropArea.style.display = 'block';
      imageList.style.display = 'none';
      addImageBtn.innerHTML = 'Cancel';
    } else {
      dropArea.style.display = 'none';
      imageList.style.display = 'block';
      addImageBtn.innerHTML = 'Add Image';
    }
  }

  private generateItemPicker(config: any): TemplateResult {
    return html`
      <div class="item-content">
        ${Picker({
          ...config,
        })}
      </div>
    `;
  }

  private _handleDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  private _handleDragLeave() {
    this.isDragging = false;
  }

  private _handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    // Define error message and toastId
    const errorMsg = this.editor.localize('card.common.toastImageError');
    const toastId = 'imagesConfig';

    // Access the files from the drag event
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // Pass the necessary target object without needing to pass an Event object
      handleFilePicked(this.editor, {
        files: files, // FileList from the DragEvent
        toastId: toastId,
        errorMsg: errorMsg,
      });
    }
  }

  public initSortable() {
    this.updateComplete.then(() => {
      const el = this.shadowRoot?.getElementById('images-list');
      if (el) {
        this._sortable = new Sortable(el, {
          handle: '.handle',
          animation: 150,
          ghostClass: 'ghost',
          onEnd: (evt) => {
            this._handleSortEnd(evt);
          },
        });
        console.log('Sortable initialized');
      }
    });
  }

  private _handleSortEnd(evt: any) {
    evt.preventDefault();
    const oldIndex = evt.oldIndex;
    const newIndex = evt.newIndex;

    if (oldIndex !== newIndex) {
      this._reorderImages(oldIndex, newIndex);
    }
  }

  private _reorderImages(oldIndex: number, newIndex: number) {
    const configImages = this._images.concat();
    const movedItem = configImages.splice(oldIndex, 1)[0];
    configImages.splice(newIndex, 0, movedItem);
    this.config = { ...this.config, images: configImages };
    this._debouncedConfigChanged();
  }

  private _toggleSelection(event: Event, url: string): void {
    event.stopPropagation();
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this._selectedItems.add(url);
      this.requestUpdate();
    } else {
      this._selectedItems.delete(url);
      this.requestUpdate();
    }
  }

  private _deselectAllItems(): void {
    const checkboxes = this.shadowRoot?.querySelectorAll('.images-list ha-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    this._selectedItems.clear(); // Clear all selections
    this.requestUpdate();
  }

  private _selectAll(): void {
    const checkboxes = this.shadowRoot?.querySelectorAll('.images-list ha-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => {
      checkbox.checked = true;
    });

    this._selectedItems.clear(); // Clear existing selections
    this.config.images.forEach((image: { url: string }) => this._selectedItems.add(image.url));

    this.requestUpdate();
  }

  private _deleteSelectedItems(): void {
    if (this._selectedItems.size === 0) return;
    const images = this.config.images.filter((image: { url: string }) => !this._selectedItems.has(image.url));
    this._selectedItems.clear();
    fireEvent(this.editor, 'config-changed', { config: { ...this.config, images } });
    this.validateImageList();
  }

  private validateImageList(): void {
    setTimeout(() => {
      const imagesListCount = this.shadowRoot?.querySelectorAll('.images-list .image-input').length || 0;
      const configImagesCount = this.config.images.length;
      if (imagesListCount !== configImagesCount) {
        console.log('Reindexing images  ...');
        this._reindexImages = true;
        setTimeout(() => {
          this._reindexImages = false;
          this.requestUpdate();
          this.initSortable();
        }, 300);
      } else {
        return;
      }
    }, 200);
  }

  private toggleAddButton(ev: Event): void {
    ev.stopPropagation();
    const target = ev.target as HTMLInputElement;
    const addButton = target.parentElement?.querySelector('.new-url-btn') as HTMLElement;
    if (!addButton) return;
    if (target.value && target.value.length > 0) {
      this._newImageUrl = target.value;
      addButton.classList.add('show');
    } else {
      addButton.classList.remove('show');
    }
  }
  private addNewImageUrl(): void {
    if (!this._newImageUrl || !this.config) return;
    const images = [...this.config.images];
    images.push({ url: this._newImageUrl, title: this._newImageUrl });
    this.config = { ...this.config, images };
    this._newImageUrl = '';
    this._debouncedConfigChanged();
  }

  _valueChanged(ev: any): void {
    ev.stopPropagation();
    if (!this.config) return;

    const target = ev.target;
    const configValue = target.configValue;
    const configType = target.configType;
    let newValue: any = ev.detail.value;

    const updates: Partial<VehicleCardConfig> = {};

    if (configType === 'images_swipe') {
      let imagesSwipe = this.config.extra_configs?.images_swipe || {};
      imagesSwipe = { ...imagesSwipe, [configValue]: newValue };
      updates.extra_configs = { ...this.config.extra_configs, images_swipe: imagesSwipe };
      this.config = { ...this.config, ...updates };
      this._debouncedConfigChanged();
    } else {
      updates[configValue] = newValue;
      this.config = { ...this.config, ...updates };
      this._debouncedConfigChanged();
    }
  }
}
