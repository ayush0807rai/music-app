package com.ayush.euphony;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            Window window = getWindow();
            if (window != null) {
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
                window.setStatusBarColor(Color.parseColor("#121A2F"));
                window.setNavigationBarColor(Color.parseColor("#121A2F"));

                WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
                if (insetsController != null) {
                    insetsController.setAppearanceLightStatusBars(false);
                    insetsController.setAppearanceLightNavigationBars(false);
                }
            }
        } catch (Exception ignored) {}

        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
            }
        } catch (Exception ignored) {}
    }
}
