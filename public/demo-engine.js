(function (root) {
  'use strict';
  function integer(raw) {
    if (!/^[+-]?\d+$/.test(String(raw).trim())) throw new Error('Enter whole numbers only.');
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || Math.abs(n) > 9999) throw new Error('Use integers from -9999 to 9999.');
    return n;
  }
  function parseList(raw) {
    if (!String(raw).trim()) throw new Error('Enter at least one number.');
    const tokens = String(raw).trim().split(/[\s,]+/);
    if (tokens.length > 12) throw new Error('Use at most 12 numbers so every cell stays readable.');
    return tokens.map(integer);
  }
  function search(kind, values, target) {
    if (kind !== 'linear' && values.some((v, i) => i && v < values[i - 1])) {
      throw new Error('Enter the array in ascending order. Values are not sorted automatically.');
    }
    const steps = [];
    let low = 0, high = values.length - 1;
    while (low <= high) {
      if (kind === 'interpolation' && (target < values[low] || target > values[high])) break;
      let pos = low;
      if (kind === 'binary') pos = low + Math.floor((high - low) / 2);
      if (kind === 'interpolation' && values[high] !== values[low]) {
        pos = low + Math.floor((target - values[low]) * (high - low) / (values[high] - values[low]));
        pos = Math.max(low, Math.min(high, pos));
      }
      const found = values[pos] === target;
      steps.push({ low, high, pos, found, message: `low = ${low} · index = ${pos} · high = ${high}: ${values[pos]} ${found ? '=' : '≠'} ${target}` });
      if (found) return { steps, message: `Found ${target} at index ${pos} after ${steps.length} comparison(s).`, index: pos };
      if (kind === 'linear' || values[pos] < target) low = pos + 1;
      else high = pos - 1;
    }
    return { steps, message: `${target} was not found. Return -1 (${steps.length} comparison(s)).`, index: -1 };
  }
  function hashSearch(keys, size, target) {
    if (!Number.isInteger(size) || size < 2 || size > 13) throw new Error('Table size must be an integer from 2 to 13.');
    const slots = Array(size).fill(null);
    for (const key of keys) {
      const home = ((key % size) + size) % size;
      for (let offset = 0; offset < size; offset++) {
        const pos = (home + offset) % size;
        if (slots[pos] === key || slots[pos] === null) { slots[pos] = key; break; }
      }
    }
    const home = ((target % size) + size) % size;
    const steps = [];
    for (let offset = 0; offset < size; offset++) {
      const pos = (home + offset) % size;
      const occupant = slots[pos];
      const found = occupant === target;
      steps.push({ pos, slots: [...slots], found, message: `h(${target}) = ${home} · probe index ${pos}: ${occupant === null ? 'empty slot' : occupant} ${found ? '=' : '≠'} ${target}` });
      if (found) return { steps, slots, message: `Found ${target} at index ${pos} after ${steps.length} probe(s).`, index: pos };
      if (occupant === null) return { steps, slots, message: `${target} was not found — an empty slot at index ${pos} stops the probe. Return -1 (${steps.length} probe(s)).`, index: -1 };
    }
    return { steps, slots, message: `${target} was not found after checking every slot. Return -1 (${steps.length} probe(s)).`, index: -1 };
  }
  function probing(keys, size) {
    if (!Number.isInteger(size) || size < 2 || size > 13) throw new Error('Table size must be an integer from 2 to 13.');
    const slots = Array(size).fill(null), steps = [];
    for (const key of keys) {
      const home = ((key % size) + size) % size;
      let placed = false;
      for (let offset = 0; offset < size; offset++) {
        const pos = (home + offset) % size;
        if (slots[pos] === key) {
          steps.push({ pos, slots: [...slots], message: `${key} already exists at index ${pos}; duplicate skipped.` });
          placed = true; break;
        }
        if (slots[pos] === null) {
          slots[pos] = key;
          steps.push({ pos, slots: [...slots], message: `h(${key}) = ${home}. Insert ${key} at index ${pos}.` });
          placed = true; break;
        }
        steps.push({ pos, slots: [...slots], message: `h(${key}) = ${home}. Index ${pos} is occupied; probe the next slot.` });
      }
      if (!placed) steps.push({ pos: -1, slots: [...slots], message: `Table full: cannot insert ${key}.` });
    }
    return { steps, slots };
  }
  function hashFunction(kind, keys, size) {
    if (!Number.isInteger(size) || size < 2 || size > 13) throw new Error('Table size must be an integer from 2 to 13.');
    const label = { division: 'division method', midsquare: 'mid-square method', multiplicative: 'multiplicative method' }[kind];
    if (!label) throw new Error('Unknown hash function.');
    const slots = Array(size).fill(null), steps = [];
    for (const key of keys) {
      let index, detail;
      if (kind === 'division') {
        index = ((key % size) + size) % size;
        detail = `h(${key}) = ${key} mod ${size} = ${index}`;
      } else if (kind === 'midsquare') {
        const square = key * key;
        const digits = Math.max(1, String(size - 1).length);
        const s = String(Math.abs(square)).padStart(digits, '0');
        const start = Math.floor((s.length - digits) / 2);
        const mid = s.substring(start, start + digits);
        index = Number(mid) % size;
        detail = `${key}² = ${square} → middle ${digits} digit(s) "${mid}" → mod ${size} = ${index}`;
      } else {
        const A = (Math.sqrt(5) - 1) / 2;
        const product = key * A;
        const frac = product - Math.floor(product);
        index = Math.min(size - 1, Math.floor(size * frac));
        detail = `h(${key}) = ⌊${size} × frac(${key} × 0.6180339887)⌋ = ⌊${size} × ${frac.toFixed(4)}⌋ = ${index}`;
      }
      const collided = slots[index] !== null && slots[index] !== key;
      slots[index] = key;
      steps.push({ pos: index, slots: [...slots], message: detail + (collided ? ' — overwrites the previous key here: this is exactly the collision problem.' : '') });
    }
    return { steps, slots, message: `Computed ${steps.length} hash value(s) using the ${label}.` };
  }
  function isPrime(n) {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
  }
  function secondaryStep(key, size) {
    let r = size - 1;
    while (r > 1 && !isPrime(r)) r -= 1;
    if (r < 1) r = 1;
    const step = r - (((key % r) + r) % r);
    return step === 0 ? r : step;
  }
  function probeSequence(keys, size, kind) {
    if (!Number.isInteger(size) || size < 2 || size > 13) throw new Error('Table size must be an integer from 2 to 13.');
    if (kind !== 'quadratic' && kind !== 'double') throw new Error('Unknown probing sequence.');
    const slots = Array(size).fill(null), steps = [];
    for (const key of keys) {
      const home = ((key % size) + size) % size;
      const step2 = kind === 'double' ? secondaryStep(key, size) : null;
      let placed = false;
      for (let i = 0; i < size; i++) {
        const pos = kind === 'quadratic'
          ? (((home + i * i) % size) + size) % size
          : (((home + i * step2) % size) + size) % size;
        const formula = kind === 'quadratic'
          ? `h(${key}) = ${home}, i = ${i} → (${home} + ${i}²) mod ${size} = ${pos}`
          : `h1(${key}) = ${home}, h2(${key}) = ${step2}, i = ${i} → (${home} + ${i}·${step2}) mod ${size} = ${pos}`;
        if (slots[pos] === key) {
          steps.push({ pos, slots: [...slots], message: `${formula}. ${key} already exists here; duplicate skipped.` });
          placed = true; break;
        }
        if (slots[pos] === null) {
          slots[pos] = key;
          steps.push({ pos, slots: [...slots], message: `${formula}. Slot empty — insert ${key}.` });
          placed = true; break;
        }
        steps.push({ pos, slots: [...slots], message: `${formula}. Slot holds ${slots[pos]} — probe again.` });
      }
      if (!placed) steps.push({ pos: -1, slots: [...slots], message: `Table full or unreachable slots: cannot insert ${key}.` });
    }
    return { steps, slots };
  }
  function chaining(keys, size) {
    if (!Number.isInteger(size) || size < 2 || size > 13) throw new Error('Table size must be an integer from 2 to 13.');
    const buckets = Array.from({ length: size }, () => []);
    const steps = [];
    for (const key of keys) {
      const home = ((key % size) + size) % size;
      const duplicate = buckets[home].includes(key);
      if (!duplicate) buckets[home].push(key);
      steps.push({
        pos: home,
        buckets: buckets.map(chain => [...chain]),
        message: duplicate
          ? `h(${key}) = ${home}. ${key} is already in this bucket; duplicate skipped.`
          : `h(${key}) = ${home}. Append ${key} to the chain: [${buckets[home].join(' → ')}].`
      });
    }
    return { steps, buckets, message: `Inserted ${keys.length} key(s) using separate chaining.` };
  }
  root.DSADemo = { integer, parseList, search, probing, hashSearch, hashFunction, probeSequence, chaining };
})(globalThis);
