(function(){
  function cfg(){ return window.PENSION_CONFIG || {}; }
  function configured(){
    const c=cfg();
    return Boolean(c.supabaseUrl && c.supabasePublishableKey && c.submitFunctionName);
  }
  async function callFunction(payload){
    if(!configured()) throw new Error('BACKEND_NOT_CONFIGURED');
    const c=cfg();
    const url=`${c.supabaseUrl.replace(/\/$/,'')}/functions/v1/${c.submitFunctionName}`;
    const res=await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':c.supabasePublishableKey},
      body:JSON.stringify(payload)
    });
    let body={};
    try{ body=await res.json(); }catch(_){ }
    if(!res.ok) throw new Error(body.error || `HTTP_${res.status}`);
    return body;
  }
  window.PensionBackend={configured,callFunction};
})();
