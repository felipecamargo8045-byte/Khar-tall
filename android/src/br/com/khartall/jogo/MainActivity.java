package br.com.khartall.jogo;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/** Bundled game, original HTTPS origin, shared account and external secure checkout. */
public final class MainActivity extends Activity {
 private static final String HOST="khar-tall-online.onrender.com";
 private static final String ORIGIN="https://"+HOST;
 private WebView web;
 private final Map<String,String> bundled=new HashMap<>();
 private final Button[] tabs=new Button[4];
 private final String[] routes={"/","/online","/loja","/conta"};
 private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
 private boolean trusted(Uri u){return u!=null&&"https".equalsIgnoreCase(u.getScheme())&&HOST.equalsIgnoreCase(u.getHost())&&u.getUserInfo()==null&&(u.getPort()==-1||u.getPort()==443);}
 @Override public void onCreate(Bundle state){super.onCreate(state);getWindow().setStatusBarColor(Color.rgb(20,19,21));getWindow().setNavigationBarColor(Color.rgb(20,19,21));
  try(InputStream input=getAssets().open("routes.json")){byte[] bytes=new byte[input.available()];int read=input.read(bytes);if(read<0)throw new IllegalStateException();JSONObject json=new JSONObject(new String(bytes,"UTF-8"));Iterator<String> keys=json.keys();while(keys.hasNext()){String key=keys.next();bundled.put(key,json.getString(key));}}catch(Exception e){throw new IllegalStateException("Game files missing",e);}
  LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(20,19,21));root.setOnApplyWindowInsetsListener((view,insets)->{view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  web=new WebView(this);web.setBackgroundColor(Color.rgb(20,19,21));root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setSafeBrowsingEnabled(true);settings.setMediaPlaybackRequiresUserGesture(true);settings.setSupportMultipleWindows(true);settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setUserAgentString(settings.getUserAgentString()+" KharTallAndroid/3.5.1");
  CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if(!trusted(uri))return null;String resource=bundled.get(uri.getPath());if(resource==null)return null;if(!"GET".equals(request.getMethod()))return null;
    try{InputStream input=getAssets().open("web/"+resource);String type=mime(resource);Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-cache");headers.put("X-Content-Type-Options","nosniff");return new WebResourceResponse(type,type.startsWith("text/")||type.contains("json")?"UTF-8":null,200,"OK",headers,input);}catch(Exception e){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",new HashMap<String,String>(),new ByteArrayInputStream(new byte[0]));}}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if(trusted(uri)&&!uri.getPath().endsWith(".apk"))return false;openExternal(uri);return true;}
   @Override public void onPageFinished(WebView view,String url){CookieManager.getInstance().flush();updateTabs(Uri.parse(url).getPath());}
  });
  web.setWebChromeClient(new WebChromeClient(){@Override public boolean onCreateWindow(WebView view,boolean dialog,boolean userGesture,Message message){if(!userGesture)return false;final WebView popup=new WebView(MainActivity.this);popup.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){Uri uri=request.getUrl();if(trusted(uri))web.loadUrl(uri.toString());else openExternal(uri);popup.destroy();return true;}});((WebView.WebViewTransport)message.obj).setWebView(popup);message.sendToTarget();return true;}});
  LinearLayout navigation=new LinearLayout(this);navigation.setGravity(Gravity.CENTER);navigation.setPadding(dp(5),dp(3),dp(5),dp(3));navigation.setBackgroundColor(Color.rgb(27,23,25));String[] labels={"♜  Jogar","⚔  Online","◇  Loja","♙  Conta"};for(int i=0;i<tabs.length;i++){final int index=i;Button button=new Button(this);button.setText(labels[i]);button.setTextSize(12);button.setAllCaps(false);button.setTypeface(Typeface.DEFAULT,Typeface.BOLD);button.setPadding(0,0,0,0);button.setMinWidth(0);button.setMinimumWidth(0);button.setContentDescription(labels[i]);button.setOnClickListener(v->{web.loadUrl(ORIGIN+routes[index]);updateTabs(routes[index]);});tabs[i]=button;navigation.addView(button,new LinearLayout.LayoutParams(0,dp(52),1));}root.addView(navigation);setContentView(root);
  Uri launch=getIntent().getData();if(state==null||web.restoreState(state)==null)web.loadUrl(trusted(launch)?launch.toString():ORIGIN+"/");updateTabs("/");
 }
 private static String mime(String file){if(file.endsWith(".html"))return "text/html";if(file.endsWith(".js"))return "text/javascript";if(file.endsWith(".css"))return "text/css";if(file.endsWith(".json")||file.endsWith(".webmanifest"))return "application/json";if(file.endsWith(".png"))return "image/png";if(file.endsWith(".webp"))return "image/webp";if(file.endsWith(".wav"))return "audio/wav";return "application/octet-stream";}
 private void updateTabs(String path){for(int i=0;i<tabs.length;i++){boolean selected=routes[i].equals(path)||(i==2&&"/painel-loja".equals(path));tabs[i].setTextColor(selected?Color.rgb(247,216,164):Color.rgb(198,184,167));tabs[i].setBackgroundColor(selected?Color.rgb(77,49,36):Color.TRANSPARENT);}}
 private void openExternal(Uri uri){if(uri==null)return;String scheme=uri.getScheme();if(!"https".equalsIgnoreCase(scheme)&&!"mailto".equalsIgnoreCase(scheme)&&!"tel".equalsIgnoreCase(scheme)){Toast.makeText(this,"Este endereço não pode ser aberto pelo jogo.",Toast.LENGTH_SHORT).show();return;}try{startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE));}catch(ActivityNotFoundException e){Toast.makeText(this,"Nenhum aplicativo disponível para abrir este endereço.",Toast.LENGTH_LONG).show();}}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);Uri uri=intent.getData();if(trusted(uri))web.loadUrl(uri.toString());}
 @Override protected void onSaveInstanceState(Bundle out){web.saveState(out);super.onSaveInstanceState(out);}
 @Override protected void onPause(){CookieManager.getInstance().flush();web.onPause();super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override public void onBackPressed(){if(web.canGoBack()){web.goBack();return;}new AlertDialog.Builder(this).setTitle("Sair do Khar Tall?").setMessage("Sua partida local fica salva neste aparelho. Nas salas online, o relógio continua contando.").setNegativeButton("Continuar jogando",(dialog,id)->{}).setPositiveButton("Sair",(dialog,id)->finish()).show();}
 @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
