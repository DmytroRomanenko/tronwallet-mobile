package com.tronwallet2;

import android.os.Bundle;
import com.facebook.react.ReactActivity;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import org.devio.rn.splashscreen.SplashScreen;
import com.crashlytics.android.Crashlytics;
import io.fabric.sdk.android.Fabric;

public class MainActivity extends ReactActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Fabric.with(this, new Crashlytics());
        SplashScreen.show(this);  // here
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
      super.onResume();
      ReactContext reactContext = getReactInstanceManager().getCurrentReactContext();
      WritableMap params = Arguments.createMap();
      params.putString("event", "active");

      // when app starts reactContext will be null initially until bridge between Native and React Native is established
      if (reactContext != null) {
        getReactInstanceManager().getCurrentReactContext()
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
          .emit("ActivityStateChange", params);
      }
    }

    // my new code here
    @Override
    protected void onPause() {
      SplashScreen.hide(this);
      super.onPause();

      ReactContext reactContext = getReactInstanceManager().getCurrentReactContext();
      WritableMap params = Arguments.createMap();
      params.putString("event", "inactive");

      if (reactContext != null) {
        getReactInstanceManager().getCurrentReactContext()
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
          .emit("ActivityStateChange", params);
      }
    }

    @Override
    public void onStop() {
      super.onStop();
      ReactContext reactContext = getReactInstanceManager().getCurrentReactContext();
      WritableMap params = Arguments.createMap();
      params.putString("event", "background");

      if (reactContext != null) {
        getReactInstanceManager().getCurrentReactContext()
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
          .emit("ActivityStateChange", params);
      }
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "tronwallet2";
    }
}
