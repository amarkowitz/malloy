/*
 * Copyright 2023 Google LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as model from '../../../model/malloy_types';
import {nameOf} from '../../field-utils';
import {SpaceEntry} from '../types/space-entry';
import {ErrorFactory} from '../error-factory';
import {HasParameter} from '../parameters/has-parameter';
import {MalloyElement} from '../types/malloy-element';
import {Join} from '../source-properties/joins';
import {SpaceField} from '../types/space-field';
import {JoinSpaceField} from './join-space-field';
import {ViewField} from './view-field';
import {AbstractParameter, SpaceParam} from '../types/space-param';
import {SourceSpec, SpaceSeed} from '../space-seed';
import {StaticSpace} from './static-space';
import {StructSpaceFieldBase} from './struct-space-field-base';

export abstract class DynamicSpace extends StaticSpace {
  protected final: model.StructDef | undefined;
  protected source: SpaceSeed;
  completions: (() => void)[] = [];
  private complete = false;
  protected newTimezone?: string;

  constructor(extending: SourceSpec) {
    const source = new SpaceSeed(extending);
    super(structuredClone(source.structDef));
    this.final = undefined;
    this.source = source;
  }

  isComplete(): void {
    this.complete = true;
  }

  protected setEntry(name: string, value: SpaceEntry): void {
    if (this.final) {
      throw new Error('Space already final');
    }
    super.setEntry(name, value);
  }

  addParameters(params: HasParameter[]): DynamicSpace {
    for (const oneP of params) {
      this.setEntry(oneP.name, new AbstractParameter(oneP));
    }
    return this;
  }

  newEntry(name: string, logTo: MalloyElement, entry: SpaceEntry): void {
    if (this.entry(name)) {
      logTo.log(`Cannot redefine '${name}'`);
      return;
    }
    this.setEntry(name, entry);
  }

  renameEntry(oldName: string, newName: string, entry: SpaceEntry) {
    this.dropEntry(oldName);
    this.setEntry(newName, entry);
  }

  addFieldDef(fd: model.FieldDef): void {
    this.setEntry(nameOf(fd), this.defToSpaceField(fd));
  }

  setTimezone(tz: string): void {
    this.newTimezone = tz;
  }

  structDef(): model.StructDef {
    const parameters = this.fromStruct.parameters || {};
    if (this.final === undefined) {
      this.final = {
        ...this.fromStruct,
        fields: [],
      };
      // Need to process the entities in specific order
      const fields: [string, SpaceField][] = [];
      const joins: [string, SpaceField][] = [];
      const turtles: [string, SpaceField][] = [];
      const fixupJoins: [Join, model.StructDef][] = [];
      for (const [name, spaceEntry] of this.entries()) {
        if (spaceEntry instanceof StructSpaceFieldBase) {
          joins.push([name, spaceEntry]);
        } else if (spaceEntry instanceof ViewField) {
          turtles.push([name, spaceEntry]);
        } else if (spaceEntry instanceof SpaceField) {
          fields.push([name, spaceEntry]);
        } else if (spaceEntry instanceof SpaceParam) {
          parameters[name] = spaceEntry.parameter();
        }
      }
      const reorderFields = [...fields, ...joins, ...turtles];
      for (const [, field] of reorderFields) {
        if (field instanceof JoinSpaceField) {
          const joinStruct = field.join.structDef();
          if (!ErrorFactory.isErrorStructDef(joinStruct)) {
            this.final.fields.push(joinStruct);
            fixupJoins.push([field.join, joinStruct]);
          }
        } else {
          const fieldDef = field.fieldDef();
          if (fieldDef) {
            this.final.fields.push(fieldDef);
          }
          // TODO I'm just removing this, but perhaps instead I should just filter
          // out ReferenceFields and still make this check.
          // else {
          //   throw new Error(`'${fieldName}' doesn't have a FieldDef`);
          // }
        }
      }
      if (Object.entries(parameters).length > 0) {
        this.final.parameters = parameters;
      }
      // If we have join expressions, we need to now go back and fill them in
      for (const [join, missingOn] of fixupJoins) {
        join.fixupJoinOn(this, missingOn);
      }
    }
    if (this.newTimezone) {
      this.final.queryTimezone = this.newTimezone;
    }
    this.isComplete();
    return this.final;
  }
}
