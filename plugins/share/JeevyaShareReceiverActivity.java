package com.aaditya001.personalityimprovementapp.share;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class JeevyaShareReceiverActivity extends Activity {
  private static final String FILE_NAME = "jeevya-share-intent.json";

  @Override protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    handleIntent(getIntent());
  }

  private void handleIntent(Intent intent) {
    try {
      JSONObject payload = new JSONObject();
      payload.put("receivedAt", System.currentTimeMillis());
      payload.put("mimeType", intent.getType() == null ? "" : intent.getType());

      CharSequence subject = intent.getCharSequenceExtra(Intent.EXTRA_SUBJECT);
      CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
      if (subject != null) payload.put("subject", subject.toString());
      if (text != null) payload.put("text", text.toString());

      if (intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
        android.net.Uri uri = intent.getClipData().getItemAt(0).getUri();
        if (uri != null) payload.put("uri", uri.toString());
      } else if (intent.getParcelableExtra(Intent.EXTRA_STREAM) != null) {
        android.net.Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (uri != null) payload.put("uri", uri.toString());
      }

      File file = new File(getFilesDir(), FILE_NAME);
      try (FileOutputStream stream = new FileOutputStream(file, false)) {
        stream.write(payload.toString().getBytes(StandardCharsets.UTF_8));
      }
    } catch (Exception ignored) {
    }

    Intent launch = new Intent(this, com.aaditya001.personalityimprovementapp.MainActivity.class);
    launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    startActivity(launch);
    finish();
  }
}
