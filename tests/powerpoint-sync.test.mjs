import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/demo-engine.js';
const d = globalThis.DSADemo;
test('all ten PowerPoint examples have the exact expected outputs', () => {
  assert.equal(d.search('linear', [14,7,21,4,18],4).index,3);
  assert.equal(d.search('binary', [3,8,12,17,23,31,42],31).index,5);
  assert.equal(d.search('interpolation', [10,20,30,40,50,60,70],50).index,4);
  assert.equal(d.hashFunction('division',[26],10).steps[0].pos,6);
  assert.equal(d.hashFunction('midsquare',[1234],100).steps[0].pos,22);
  assert.equal(d.hashFunction('multiplicative',[26],10).steps[0].pos,0);
  assert.deepEqual(d.chaining([15,25,35],10).buckets[5],[35,25,15]);
  assert.deepEqual(d.probing([12,22,32],10).slots.slice(2,5),[12,22,32]);
  const q=d.probeSequence([22,33,44],11,'quadratic').slots;
  assert.deepEqual([q.indexOf(22),q.indexOf(33),q.indexOf(44)],[0,1,3]);
  const h=d.probeSequence([22,33,44],11,'double').slots;
  assert.deepEqual([h.indexOf(22),h.indexOf(33),h.indexOf(44)],[0,4,5]);
});
test('searches agree with membership on 500 deterministic arrays, including empty, duplicate and negative values',()=>{
  let seed=73; const rand=()=> (seed=(seed*1664525+1013904223)>>>0);
  for(let trial=0;trial<500;trial++){
    const a=Array.from({length:rand()%13},()=>rand()%31-15);
    for(const kind of ['linear','binary','interpolation']){
      const v=kind==='linear'?a:[...a].sort((a,b)=>a-b);
      for(let x=-16;x<=16;x++){
        const r=d.search(kind,v,x);
        assert.equal(r.index>=0,v.includes(x));
        if(r.index>=0) assert.equal(v[r.index],x);
        if(kind==='linear') assert.equal(r.index,v.indexOf(x));
        assert.ok(r.steps.length<=v.length);
      }
    }
  }
});
test('probing fills every capacity, reports full and preserves occupied slots',()=>{
  for(let size=2;size<=13;size++) for(const kind of ['linear','quadratic','double']){
    if(kind==='double' && ![2,3,5,7,11,13].includes(size)) continue;
    const keys=Array.from({length:size},(_,i)=>i*size);
    const run=k=>kind==='linear'?d.probing(k,size):d.probeSequence(k,size,kind);
    const before=run(keys), after=run([...keys,9999]);
    assert.equal(before.slots.filter(v=>v!==null).length,size);
    assert.ok(keys.every(k=>before.slots.includes(k)));
    assert.deepEqual(after.slots,before.slots);
    assert.match(after.steps.at(-1).message,/cannot insert/);
    for(const step of before.steps) assert.equal(step.slots.length,size);
  }
  assert.throws(()=>d.probeSequence([1],10,'double'),/prime/);
  assert.throws(()=>d.hashSearch([0,2,4],2,4),/not all keys/);
});
test('quadratic skips virtual slots and repeated keys follow the slide semantics',()=>{
  const q=d.probeSequence([2,5,8],3,'quadratic');
  assert.deepEqual(q.slots,[8,5,2]);
  assert.ok(q.steps.some(s=>/skip this gap/.test(s.message)));
  assert.equal(d.probeSequence([1,1],3,'quadratic').slots.filter(v=>v===1).length,2);
  assert.equal(d.probeSequence([1,1],3,'double').slots.filter(v=>v===1).length,1);
  assert.deepEqual(d.hashFunction('division',[6,16],10).slots[6],16);
  for(let k=0;k<=9999;k++){
    const expected=Number(String(k*k).padStart(8,'0').slice(3,5));
    assert.equal(d.hashFunction('midsquare',[k],100).steps[0].pos,expected);
  }
});

test('web form defaults execute the same examples as the PowerPoint', async()=>{
  const {readFile}=await import('node:fs/promises');
  const {runInNewContext}=await import('node:vm');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const defaults=runInNewContext('('+app.match(/const defaults = (\{[\s\S]*?\n  \});/)[1]+')');
  const expected={linear:3,binary:5,interpolation:4,division:6,midsquare:22,multiplicative:0};
  for(const [name,fields] of Object.entries(defaults)){
    const keys=d.parseList(fields[0]),arg=d.integer(fields[1]);
    const result=['linear','binary','interpolation'].includes(name)?d.search(name,keys,arg)
      :name==='probing'?d.probing(keys,arg)
      :name==='hashSearch'?d.hashSearch(keys,arg,d.integer(fields[2]))
      :name==='chaining'?d.chaining(keys,arg)
      :['double','quadratic'].includes(name)?d.probeSequence(keys,arg,name)
      :d.hashFunction(name,keys,arg);
    if(name in expected) assert.equal(result.index ?? result.steps[0].pos,expected[name]);
    assert.ok(result.steps.length>0,name);
  }
  const html=await readFile(new URL('../public/presentation.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/folding|universal|i²/i);
  for(const [title,fn] of [['Linear search code','linear_search'],['Binary search code','binarySearch'],['Interpolation search code','interpolation_search']]){
    const section=html.match(new RegExp('data-title="'+title+'"[\\s\\S]*?</section>'))[0];
    assert.ok(section.includes(fn),title);
  }
});
