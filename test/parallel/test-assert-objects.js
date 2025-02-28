'use strict';

const common = require('../common');
const vm = require('node:vm');
const assert = require('node:assert');
const { describe, it } = require('node:test');

function createCircularObject() {
  const obj = {};
  obj.self = obj;
  return obj;
}

function createDeepNestedObject() {
  return { level1: { level2: { level3: 'deepValue' } } };
}

async function generateCryptoKey() {
  const { KeyObject } = require('node:crypto');
  const { subtle } = globalThis.crypto;

  const cryptoKey = await subtle.generateKey(
    {
      name: 'HMAC',
      hash: 'SHA-256',
      length: 256,
    },
    true,
    ['sign', 'verify']
  );

  const keyObject = KeyObject.from(cryptoKey);

  return { cryptoKey, keyObject };
}

describe('Object Comparison Tests', () => {
  describe('partialDeepStrictEqual', () => {
    describe('throws an error', () => {
      const tests = [
        {
          description: 'throws when only one argument is provided',
          actual: { a: 1 },
          expected: undefined,
        },
        {
          description: 'throws when expected has more properties than actual',
          actual: [1, 'two'],
          expected: [1, 'two', true],
        },
        {
          description: 'throws because expected has seven 2 while actual has six one',
          actual: [1, 2, 2, 2, 2, 2, 2, 3],
          expected: [1, 2, 2, 2, 2, 2, 2, 2],
        },
        {
          description: 'throws when comparing two different sets with objects',
          actual: new Set([{ a: 1 }]),
          expected: new Set([{ a: 1 }, { b: 1 }]),
        },

        {
          description: 'throws when comparing two WeakSet objects',
          actual: new WeakSet(),
          expected: new WeakSet(),
        },
        {
          description: 'throws when comparing two WeakMap objects',
          actual: new WeakMap(),
          expected: new WeakMap(),
        },
        {
          description: 'throws when comparing two different objects',
          actual: { a: 1, b: 'string' },
          expected: { a: 2, b: 'string' },
        },
        {
          description:
            'throws when comparing two objects with different nested objects',
          actual: createDeepNestedObject(),
          expected: { level1: { level2: { level3: 'differentValue' } } },
        },
        {
          description:
            'throws when comparing two objects with different RegExp properties',
          actual: { pattern: /abc/ },
          expected: { pattern: /def/ },
        },
        {
          description:
            'throws when comparing two arrays with different elements',
          actual: [1, 'two', true],
          expected: [1, 'two', false],
        },
        {
          description:
            'throws when comparing two Date objects with different times',
          actual: new Date(0),
          expected: new Date(1),
        },
        {
          description:
            'throws when comparing two objects with different large number of properties',
          actual: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`key${i}`, i])
          ),
          expected: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`key${i}`, i + 1])
          ),
        },
        {
          description:
            'throws when comparing two objects with different Symbols',
          actual: { [Symbol('test')]: 'symbol' },
          expected: { [Symbol('test')]: 'symbol' },
        },
        {
          description:
            'throws when comparing two objects with different array properties',
          actual: { a: [1, 2, 3] },
          expected: { a: [1, 2, 4] },
        },
        {
          description:
            'throws when comparing two objects with different function properties',
          actual: { fn: () => {} },
          expected: { fn: () => {} },
        },
        {
          description:
            'throws when comparing two objects with different Error instances',
          actual: { error: new Error('Test error 1') },
          expected: { error: new Error('Test error 2') },
        },
        {
          description:
            'throws when comparing two objects with different TypedArray instances and content',
          actual: { typedArray: new Uint8Array([1, 2, 3]) },
          expected: { typedArray: new Uint8Array([4, 5, 6]) },
        },
        {
          description:
            'throws when comparing two Map objects with different entries',
          actual: new Map([
            ['key1', 'value1'],
            ['key2', 'value2'],
          ]),
          expected: new Map([
            ['key1', 'value1'],
            ['key3', 'value3'],
          ]),
        },
        {
          description:
            'throws when comparing two Map objects with different keys',
          actual: new Map([
            ['key1', 'value1'],
            ['key2', 'value2'],
          ]),
          expected: new Map([
            ['key1', 'value1'],
            ['key3', 'value2'],
          ]),
        },
        {
          description:
            'throws when comparing two Map objects with different length',
          actual: new Map([
            ['key1', 'value1'],
            ['key2', 'value2'],
          ]),
          expected: new Map([['key1', 'value1']]),
        },
        {
          description:
            'throws when comparing two TypedArray instances with different content',
          actual: new Uint8Array(10),
          expected: () => {
            const typedArray2 = new Int8Array(10);
            Object.defineProperty(typedArray2, Symbol.toStringTag, {
              value: 'Uint8Array'
            });
            Object.setPrototypeOf(typedArray2, Uint8Array.prototype);

            return typedArray2;
          },
        },
        {
          description:
            'throws when comparing two Set objects from different realms with different values',
          actual: new vm.runInNewContext('new Set(["value1", "value2"])'),
          expected: new Set(['value1', 'value3']),
        },
        {
          description:
            'throws when comparing two Set objects with different values',
          actual: new Set(['value1', 'value2']),
          expected: new Set(['value1', 'value3']),
        },
        {
          description: 'throws when comparing one subset object with another',
          actual: { a: 1, b: 2, c: 3 },
          expected: { b: '2' },
        },
        {
          description: 'throws when comparing one subset array with another',
          actual: [1, 2, 3],
          expected: ['2'],
        },
      ];

      if (common.hasCrypto) {
        tests.push({
          description:
            'throws when comparing two objects with different CryptoKey instances objects',
          actual: async () => {
            return generateCryptoKey();
          },
          expected: async () => {
            return generateCryptoKey();
          },
        });

        const { createSecretKey } = require('node:crypto');

        tests.push({
          description:
            'throws when comparing two objects with different KeyObject instances objects',
          actual: createSecretKey(Buffer.alloc(1, 0)),
          expected: createSecretKey(Buffer.alloc(1, 1)),
        });
      }

      tests.forEach(({ description, actual, expected }) => {
        it(description, () => {
          assert.throws(() => assert.partialDeepStrictEqual(actual, expected), Error);
        });
      });
    });
  });

  describe('does not throw an error', () => {
    const sym = Symbol('test');
    const func = () => {};

    [
      {
        description: 'compares two identical simple objects',
        actual: { a: 1, b: 'string' },
        expected: { a: 1, b: 'string' },
      },
      {
        description: 'compares two objects with different property order',
        actual: { a: 1, b: 'string' },
        expected: { b: 'string', a: 1 },
      },
      {
        description: 'compares two deeply nested objects with partial equality',
        actual: { a: { nested: { property: true, some: 'other' } } },
        expected: { a: { nested: { property: true } } },
      },
      {
        description:
          'compares plain objects from different realms',
        actual: vm.runInNewContext(`({
          a: 1,
          b: 2n,
          c: "3",
          d: /4/,
          e: new Set([5]),
          f: [6],
          g: new Uint8Array()
        })`),
        expected: { b: 2n, e: new Set([5]), f: [6], g: new Uint8Array() },
      },
      {
        description: 'compares two integers',
        actual: 1,
        expected: 1,
      },
      {
        description: 'compares two strings',
        actual: '1',
        expected: '1',
      },
      {
        description: 'compares two objects with nested objects',
        actual: createDeepNestedObject(),
        expected: createDeepNestedObject(),
      },
      {
        description: 'compares two objects with circular references',
        actual: createCircularObject(),
        expected: createCircularObject(),
      },
      {
        description: 'compares two arrays with identical elements',
        actual: [1, 'two', true],
        expected: [1, 'two', true],
      },
      {
        description: 'compares two Date objects with the same time',
        actual: new Date(0),
        expected: new Date(0),
      },
      {
        description: 'compares two objects with large number of properties',
        actual: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`key${i}`, i])
        ),
        expected: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`key${i}`, i])
        ),
      },
      {
        description: 'compares two objects with Symbol properties',
        actual: { [sym]: 'symbol' },
        expected: { [sym]: 'symbol' },
      },
      {
        description: 'compares two objects with RegExp properties',
        actual: { pattern: /abc/ },
        expected: { pattern: /abc/ },
      },
      {
        description: 'compares two objects with identical function properties',
        actual: { fn: func },
        expected: { fn: func },
      },
      {
        description: 'compares two objects with mixed types of properties',
        actual: { num: 1, str: 'test', bool: true, sym },
        expected: { num: 1, str: 'test', bool: true, sym },
      },
      {
        description: 'compares two objects with Buffers',
        actual: { buf: Buffer.from('Node.js') },
        expected: { buf: Buffer.from('Node.js') },
      },
      {
        description: 'compares two objects with identical Error properties',
        actual: { error: new Error('Test error') },
        expected: { error: new Error('Test error') },
      },
      {
        description: 'compares two objects with TypedArray instances with the same content',
        actual: { typedArray: new Uint8Array([1, 2, 3]) },
        expected: { typedArray: new Uint8Array([1, 2, 3]) },
      },
      {
        description: 'compares two Map objects with identical entries',
        actual: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
        expected: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
      },
      {
        describe: 'compares two array of objects',
        actual: [{ a: 5 }],
        expected: [{ a: 5 }],
      },
      {
        describe: 'compares two array of objects where expected is a subset of actual',
        actual: [{ a: 5 }, { b: 5 }],
        expected: [{ a: 5 }],
      },
      {
        description: 'compares two Set objects with identical objects',
        actual: new Set([{ a: 1 }]),
        expected: new Set([{ a: 1 }]),
      },
      {
        description: 'compares two Set objects where expected is a subset of actual',
        actual: new Set([{ a: 1 }, { b: 1 }]),
        expected: new Set([{ a: 1 }]),
      },
      {
        description: 'compares two Set objects with identical arrays',
        actual: new Set(['value1', 'value2']),
        expected: new Set(['value1', 'value2']),
      },
      {
        description: 'compares two Set objects',
        actual: new Set(['value1', 'value2', 'value3']),
        expected: new Set(['value1', 'value2']),
      },
      {
        description:
          'compares two Map objects from different realms with identical entries',
        actual: new vm.runInNewContext(
          'new Map([["key1", "value1"], ["key2", "value2"]])'
        ),
        expected: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
      },
      {
        description:
          'compares two objects with identical getter/setter properties',
        actual: (() => {
          let value = 'test';
          return Object.defineProperty({}, 'prop', {
            get: () => value,
            set: (newValue) => {
              value = newValue;
            },
            enumerable: true,
            configurable: true,
          });
        })(),
        expected: (() => {
          let value = 'test';
          return Object.defineProperty({}, 'prop', {
            get: () => value,
            set: (newValue) => {
              value = newValue;
            },
            enumerable: true,
            configurable: true,
          });
        })(),
      },
      {
        description: 'compares two objects with no prototype',
        actual: { __proto__: null, prop: 'value' },
        expected: { __proto__: null, prop: 'value' },
      },
      {
        description:
          'compares two objects with identical non-enumerable properties',
        actual: (() => {
          const obj = {};
          Object.defineProperty(obj, 'hidden', {
            value: 'secret',
            enumerable: false,
          });
          return obj;
        })(),
        expected: (() => {
          const obj = {};
          Object.defineProperty(obj, 'hidden', {
            value: 'secret',
            enumerable: false,
          });
          return obj;
        })(),
      },
      {
        description: 'compares two identical primitives, string',
        actual: 'foo',
        expected: 'foo',
      },
      {
        description: 'compares two identical primitives, number',
        actual: 1,
        expected: 1,
      },
      {
        description: 'compares two identical primitives, boolean',
        actual: false,
        expected: false,
      },
      {
        description: 'compares two identical primitives, null',
        actual: null,
        expected: null,
      },
      {
        description: 'compares two identical primitives, undefined',
        actual: undefined,
        expected: undefined,
      },
      {
        description: 'compares two identical primitives, Symbol',
        actual: sym,
        expected: sym,
      },
      {
        description:
          'compares one subset object with another',
        actual: { a: 1, b: 2, c: 3 },
        expected: { b: 2 },
      },
      {
        description:
          'compares one subset array with another',
        actual: [1, 2, 3],
        expected: [2],
      },
    ].forEach(({ description, actual, expected }) => {
      it(description, () => {
        assert.partialDeepStrictEqual(actual, expected);
      });
    });
  });
});
