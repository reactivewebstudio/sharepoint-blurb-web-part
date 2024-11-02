import * as React from 'react';
import * as ReactDom from 'react-dom';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneSlider,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as strings from 'BlurbWebPartStrings';
import { Blurb } from './components/Blurb';
import { IBlurbProps } from './components/IBlurbProps';
import { PropertyFieldColorPicker, PropertyFieldColorPickerStyle } from '@pnp/spfx-property-controls/lib/PropertyFieldColorPicker';
import { PropertyFieldIconPicker } from '@pnp/spfx-property-controls/lib/PropertyFieldIconPicker';
import { initializeIcons } from '@fluentui/react/lib/Icons';

export interface IBlurbWebPartProps {
  description: string;
  containerCount: number;
  containers: Array<{
    fontColor: string;
    icon: string;
    backgroundColor: string;
    borderColor: string;
    borderRadius: string;
    title: string;
    text: string;
  }>;
}

export default class BlurbWebPart extends BaseClientSideWebPart<IBlurbWebPartProps> {
  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = '';
  private selectedContainerIndex: number = -1;
  private _isEditMode: boolean = false;

  public render(): void {
    const element: React.ReactElement<IBlurbProps> = React.createElement(
      Blurb,
      {
        description: this.properties.description,
        isDarkTheme: this._isDarkTheme,
        environmentMessage: this._environmentMessage,
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
        userDisplayName: this.context.pageContext.user.displayName,
        containers: this.properties.containers || [],
        containerCount: this.properties.containerCount || 1,
  
        onContainerClick: async (index: number) => {
          // If the property pane is already open, close it
          if (this.context.propertyPane.isRenderedByWebPart()) {
            this.context.propertyPane.close();
          }
  
          // Give it a slight delay to ensure it fully closes
          await new Promise(resolve => setTimeout(resolve, 100));
  
          // Set the selected container index
          this.selectedContainerIndex = index;
  
          // Set edit mode and refresh the property pane
          this._isEditMode = true;
          this.context.propertyPane.refresh();
          
          // Open the property pane to display the container properties
          this.context.propertyPane.open();
        }
      }
    );
  
    ReactDom.render(element, this.domElement);
  }
  
  
  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected async onInit(): Promise<void> {
    initializeIcons();
    
    if (!this.properties.containerCount) {
      this.properties.containerCount = 1;
    }

    if (!this.properties.containers) {
      this.properties.containers = [];
    }

    const currentContainerCount = this.properties.containers.length;
    if (this.properties.containerCount > currentContainerCount) {
      for (let i = currentContainerCount; i < this.properties.containerCount; i++) {
        this.properties.containers.push({
          icon: '',
          backgroundColor: '#ffffff',
          borderColor: '#000000',
          borderRadius: '0px',
          fontColor: '#000000',
          title: `Blurb ${i + 1}`,
          text: 'Add text'
        });
      }
    } else if (this.properties.containerCount < currentContainerCount) {
      this.properties.containers.splice(this.properties.containerCount);
    }

    const message = await this._getEnvironmentMessage();
    this._environmentMessage = message;

    return super.onInit();
  }

  protected onPropertyPaneConfigurationComplete(): void {
    this._isEditMode = false;
    this.selectedContainerIndex = -1;
  }

  private async _getEnvironmentMessage(): Promise<string> {
    if (!!this.context.sdks.microsoftTeams) {
      const context = await this.context.sdks.microsoftTeams.teamsJs.app.getContext();
      let environmentMessage: string = '';
      switch (context.app.host.name) {
        case 'Office':
          environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOffice : strings.AppOfficeEnvironment;
          break;
        case 'Outlook':
          environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOutlook : strings.AppOutlookEnvironment;
          break;
        case 'Teams':
          environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentTeams : strings.AppTeamsTabEnvironment;
          break;
        default:
          environmentMessage = strings.UnknownEnvironment;
      }
      return environmentMessage;
    }
    return this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentSharePoint : strings.AppSharePointEnvironment;
  }

  protected onPropertyPaneFieldChanged(propertyPath: string, oldValue: string | number, newValue: string | number): void {
    if (propertyPath === 'containerCount' && newValue !== oldValue) {
      const newContainerCount = newValue as number;
      const currentContainerCount = this.properties.containers.length;

      if (newContainerCount > currentContainerCount) {
        for (let i = currentContainerCount; i < newContainerCount; i++) {
          this.properties.containers.push({
            icon: '',
            backgroundColor: '#ffffff',
            borderColor: '#000000',
            borderRadius: '0px',
            fontColor: '#000000',
            title: `Blurb ${i + 1}`,
            text: 'Add text'
          });
        }
      } else if (newContainerCount < currentContainerCount) {
        this.properties.containers.splice(newContainerCount);
      }
    }

    super.onPropertyPaneFieldChanged(propertyPath, oldValue, newValue);
    this.render();
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    if (this._isEditMode && this.selectedContainerIndex !== -1) {
      const selectedContainer = this.properties.containers[this.selectedContainerIndex] || {};
      return {
        pages: [
          {
            header: { description: `Configure Blurb ${this.selectedContainerIndex + 1}` },
            groups: [
              {
                groupName: "Blurb Settings",
                groupFields: [
                  PropertyFieldIconPicker(`containers[${this.selectedContainerIndex}].icon`, {
                    label: "Select Icon",
                    currentIcon: selectedContainer.icon,
                    onSave: (iconName: string) => {
                      this.properties.containers[this.selectedContainerIndex].icon = iconName;
                      this.render();
                    },
                    properties: this.properties,
                    onPropertyChange: this.onPropertyPaneFieldChanged.bind(this),
                    buttonLabel: "Select Icon",
                    renderOption: "panel",
                    key: `iconPicker-${this.selectedContainerIndex}`
                  }),
                  PropertyPaneTextField(`containers[${this.selectedContainerIndex}].title`, {
                    label: `Blurb Title ${this.selectedContainerIndex + 1}`,
                    value: selectedContainer.title || ''
                  }),
                  PropertyPaneTextField(`containers[${this.selectedContainerIndex}].text`, {
                    label: `Blurb Text ${this.selectedContainerIndex + 1}`,
                    value: selectedContainer.text || ''
                  }),
                  PropertyFieldColorPicker(`containers[${this.selectedContainerIndex}].fontColor`, {
                    label: "Font Color",
                    selectedColor: selectedContainer.fontColor,
                    onPropertyChange: this.onPropertyPaneFieldChanged.bind(this),
                    properties: this.properties,
                    style: PropertyFieldColorPickerStyle.Inline,
                    showPreview: true,
                    key: `fontColor-${this.selectedContainerIndex}`
                  }),
                  PropertyFieldColorPicker(`containers[${this.selectedContainerIndex}].backgroundColor`, {
                    label: "Background Color",
                    selectedColor: selectedContainer.backgroundColor,
                    onPropertyChange: this.onPropertyPaneFieldChanged.bind(this),
                    properties: this.properties,
                    style: PropertyFieldColorPickerStyle.Inline,
                    showPreview: true,
                    key: `backgroundColor-${this.selectedContainerIndex}`
                  }),
                  PropertyFieldColorPicker(`containers[${this.selectedContainerIndex}].borderColor`, {
                    label: "Border Color",
                    selectedColor: selectedContainer.borderColor,
                    onPropertyChange: this.onPropertyPaneFieldChanged.bind(this),
                    properties: this.properties,
                    style: PropertyFieldColorPickerStyle.Inline,
                    showPreview: true,
                    key: `borderColor-${this.selectedContainerIndex}`
                  }),
                  PropertyPaneSlider(`containers[${this.selectedContainerIndex}].borderRadius`, {
                    label: "Border Radius",
                    min: 0,
                    max: 50,
                    step: 1,
                    value: selectedContainer.borderRadius ? parseInt(selectedContainer.borderRadius, 10) : 0,
                    showValue: true,
                  }),
                ]
              }
            ]
          }
        ]
      };
    }

    return {
      pages: [
        {
          header: { description: "Select a Blurb to configure its properties" },
          groups: [
            {
              groupName: "Settings",
              groupFields: [
                PropertyPaneTextField('description', {
                  label: "Description",
                  value: this.properties.description,
                }),
                PropertyPaneSlider('containerCount', {
                  label: "Number of Blurbs",
                  min: 1,
                  max: 4,
                  value: this.properties.containerCount,
                  showValue: true,
                }),
              ]
            }
          ]
        }
      ]
    };
  }
}
