import type { Schema, Struct } from '@strapi/strapi';

export interface ElementAreaValues extends Struct.ComponentSchema {
  collectionName: 'components_element_area_values';
  info: {
    description: '\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043F\u043B\u043E\u0449\u0430\u0434\u0435\u0439 \u0434\u043B\u044F \u0435\u0434\u0438\u043D\u0438\u0446\u044B \u0438 \u0432\u0441\u0435\u0433\u043E \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0430';
    displayName: 'AreaValues';
  };
  attributes: {
    single: Schema.Attribute.Decimal;
    total: Schema.Attribute.Decimal;
  };
}

export interface ElementFireProtectionAreas extends Struct.ComponentSchema {
  collectionName: 'components_element_fire_protection_areas';
  info: {
    description: '\u041F\u043B\u043E\u0449\u0430\u0434\u0438 \u043E\u0433\u043D\u0435\u0437\u0430\u0449\u0438\u0442\u044B \u043F\u043E \u0440\u0430\u0437\u043D\u044B\u043C \u043F\u0440\u0435\u0434\u0435\u043B\u0430\u043C';
    displayName: 'FireProtectionAreas';
  };
  attributes: {
    r120: Schema.Attribute.Component<'element.area-values', false>;
    r15: Schema.Attribute.Component<'element.area-values', false>;
    r45: Schema.Attribute.Component<'element.area-values', false>;
    r60: Schema.Attribute.Component<'element.area-values', false>;
    r90: Schema.Attribute.Component<'element.area-values', false>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'element.area-values': ElementAreaValues;
      'element.fire-protection-areas': ElementFireProtectionAreas;
    }
  }
}
