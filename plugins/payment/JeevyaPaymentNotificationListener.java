package com.aaditya001.personalityimprovementapp.payment;

import android.app.Notification;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.os.Bundle;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.json.JSONObject;

public class JeevyaPaymentNotificationListener extends NotificationListenerService {
  private static final String FILE_NAME = "jeevya-payment-notifications.jsonl";

  private String providerLabel(String pkg) {
    try {
      ApplicationInfo info = getPackageManager().getApplicationInfo(pkg, 0);
      return getPackageManager().getApplicationLabel(info).toString();
    } catch (Exception ignored) { return pkg; }
  }

  private boolean isSupported(String pkg, String label) {
    String value = (pkg + " " + label).toLowerCase(Locale.ROOT);
    return pkg.equals("com.google.android.apps.nbu.paisa.user")
      || pkg.equals("com.phonepe.app")
      || pkg.equals("net.one97.paytm")
      || pkg.equals("in.org.npci.upiapp")
      || value.contains("yono")
      || value.contains("state bank of india")
      || value.contains("pnb one")
      || value.contains("punjab national bank");
  }

  private String readText(StatusBarNotification sbn) {
    Notification notification = sbn.getNotification();
    Bundle extras = notification.extras;
    if (extras == null) return "";
    StringBuilder value = new StringBuilder();
    append(value, extras.getCharSequence(Notification.EXTRA_TITLE));
    append(value, extras.getCharSequence(Notification.EXTRA_TEXT));
    append(value, extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
    CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
    if (lines != null) for (CharSequence line : lines) append(value, line);
    return value.toString().trim();
  }

  private void append(StringBuilder value, CharSequence text) {
    if (text != null && text.length() > 0) { if (value.length() > 0) value.append("\n"); value.append(text); }
  }

  @Override public void onCreate() {
    super.onCreate();
    // NotificationListenerService is recreated by Android after process/device restart
    // when notification-listener access remains enabled. Keep the service stateless so
    // no payment data needs to be restored here.
  }

  @Override public void onListenerDisconnected() {
    try {
      requestRebind(new android.content.ComponentName(this, JeevyaPaymentNotificationListener.class));
    } catch (Exception ignored) { }
  }

  @Override public void onNotificationPosted(StatusBarNotification sbn) {
    if (sbn == null) return;
    try {
      String label = providerLabel(sbn.getPackageName());
      if (!isSupported(sbn.getPackageName(), label)) return;
      String text = readText(sbn);
      if (text.length() == 0) return;
      JSONObject event = new JSONObject();
      event.put("notificationKey", sbn.getKey());
      event.put("packageName", sbn.getPackageName());
      event.put("appLabel", label);
      event.put("text", text);
      event.put("postedAt", sbn.getPostTime());
      File file = new File(getFilesDir(), FILE_NAME);
      try (FileOutputStream stream = new FileOutputStream(file, true)) { stream.write((event.toString() + "\n").getBytes(StandardCharsets.UTF_8)); }
    } catch (Exception ignored) { }
  }
}