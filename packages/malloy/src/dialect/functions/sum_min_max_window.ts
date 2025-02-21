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

import {ExpressionValueType} from '../../model/malloy_types';
import {
  overload,
  sql,
  DialectFunctionOverloadDef,
  minAnalytic,
  maxAggregate,
  output,
  makeParam,
} from './util';

const types: ExpressionValueType[] = ['string', 'number', 'timestamp', 'date'];

export function fnMinCumulative(): DialectFunctionOverloadDef[] {
  return types.flatMap(type => {
    const value = makeParam('value', output(maxAggregate(type)));
    return [
      overload(minAnalytic(type), [value.param], sql`MIN(${value.arg})`, {
        needsWindowOrderBy: true,
      }),
    ];
  });
}

export function fnMaxCumulative(): DialectFunctionOverloadDef[] {
  return types.flatMap(type => {
    const value = makeParam('value', output(maxAggregate(type)));
    return [
      overload(minAnalytic(type), [value.param], sql`MAX(${value.arg})`, {
        needsWindowOrderBy: true,
      }),
    ];
  });
}

export function fnSumCumulative(): DialectFunctionOverloadDef[] {
  return types.flatMap(type => {
    const value = makeParam('value', output(maxAggregate(type)));
    return [
      overload(minAnalytic(type), [value.param], sql`SUM(${value.arg})`, {
        needsWindowOrderBy: true,
      }),
    ];
  });
}

export function fnMinWindow(): DialectFunctionOverloadDef[] {
  return types.flatMap(type => {
    const value = makeParam('value', output(maxAggregate(type)));
    return [
      overload(minAnalytic(type), [value.param], sql`MIN(${value.arg})`, {
        needsWindowOrderBy: false,
      }),
    ];
  });
}

export function fnMaxWindow(): DialectFunctionOverloadDef[] {
  return types.flatMap(type => {
    const value = makeParam('value', output(maxAggregate(type)));
    return [
      overload(minAnalytic(type), [value.param], sql`MAX(${value.arg})`, {
        needsWindowOrderBy: false,
      }),
    ];
  });
}

export function fnSumWindow(): DialectFunctionOverloadDef[] {
  return types.flatMap(type => {
    const value = makeParam('value', output(maxAggregate(type)));
    return [
      overload(minAnalytic(type), [value.param], sql`SUM(${value.arg})`, {
        needsWindowOrderBy: false,
      }),
    ];
  });
}
