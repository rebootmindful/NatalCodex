function log(msg){process.stdout.write(msg+"\n")}
function assert(cond,msg){if(!cond)throw new Error(msg||'assert failed')}

async function run(name,fn){try{await fn();log('PASS '+name)}catch(e){log('FAIL '+name+': '+(e&&e.message||e));process.exitCode=1}}

async function testReport(){
  const handler=require('../api/reports/generateWithAPImart');
  function mkRes(){return{code:200,_body:null,status(c){this.code=c;return this},json(o){this._body=o}}}
  // missing fields
  let res=mkRes();
  await handler({method:'POST',body:{orderId:'o1',birthData:null}},res);
  assert(res.code===400,'should 400 on missing fields');
  assert(res._body&&res._body.error,'should include error');

  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      choices: [{ message: { content: '## AI Content\nHello' } }]
    })
  });
  try {
    res=mkRes();
    await handler({method:'POST',body:{orderId:'o2',birthData:{name:'A',gender:'男',date:'1990-01-01',time:'08:00',location:'Beijing',timezone:'Asia/Shanghai'}}},res);
    assert(res.code===200,'should 200');
    assert(res._body&&res._body.success===true,'success true');
    assert(typeof res._body.reportContent==='string','has reportContent');
    assert(res._body.reportContent.includes('AI Content'),'includes model content');
  } finally {
    globalThis.fetch = prevFetch;
  }
}

async function testKie(){
  const query=require('../backup-legacy/kie/queryTask');
  const create=require('../backup-legacy/kie/createTask');
  const callback=require('../backup-legacy/kie/callback');
  function mkRes(){return{code:200,_body:null,status(c){this.code=c;return this},json(o){this._body=o},end(){}}}
  const prevKey=process.env.KIE_API_KEY;process.env.KIE_API_KEY='dummy';
  let res=mkRes();
  await query({method:'GET',url:'/api/kie/queryTask'},res);
  assert(res.code===400,'query should 400 without taskId');
  // create without key
  const prev=process.env.KIE_API_KEY;process.env.KIE_API_KEY='';
  res=mkRes();
  await create({method:'POST',body:{prompt:'x'}},res);
  assert(res.code===500,'create should 500 missing key');
  process.env.KIE_API_KEY=prev;
  process.env.KIE_API_KEY=prevKey;
  // callback GET method not allowed
  res=mkRes();
  await callback({method:'GET',url:'/api/kie/callback?token=abc'},res);
  assert(res.code===405,'callback GET should 405');
  assert(res._body && res._body.allow==='POST','should inform allow POST');
}

async function testStore(){
  const handler=require('../backup-legacy/kie/storeResult');
  function mkRes(){return{code:200,_body:null,status(c){this.code=c;return this},json(o){this._body=o}}}
  let res=mkRes();
  await handler({method:'POST',body:{taskId:'t1',imageUrl:'https://example.com/i1.png'},headers:{},url:'/api/kie/storeResult'},res);
  assert(res.code===200,'store POST returns 200');
  assert(res._body&&res._body.success===true,'store success');
  const sid=res._body.shortId||'';
  res=mkRes();
  await handler({method:'GET',url:'/api/kie/storeResult?shortId='+encodeURIComponent(sid)},res);
  assert(res.code===200,'store GET by shortId 200');
  assert(res._body&&res._body.imageUrl,'store GET returns imageUrl');
  res=mkRes();
  await handler({method:'GET',url:'/api/kie/storeResult?action=export'},res);
  assert(res.code===200,'export 200');
  assert(res._body&&Array.isArray(res._body.items),'export returns items');
}

(async()=>{
  await run('report.generate',testReport);
  await run('kie.endpoints',testKie);
  await run('kie.storeResult',testStore);
  log('Done');
})();
