plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.fitcalendar"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.fitcalendar"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }
    buildFeatures { compose = false }
    kotlinOptions { jvmTarget = "17" }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // AndroidX core
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.webkit:webkit:1.9.0")
}

// Auto-build web frontend before assembling APK
tasks.register<Exec>("buildWeb") {
    workingDir = file("src/main/web")
    // Use npx.cmd on Windows, npx on Unix
    val cmd = if (System.getProperty("os.name").lowercase().contains("win")) "npx.cmd" else "npx"
    commandLine(cmd, "vite", "build")
    // Only run if source exists (don't fail if web/ not set up)
    onlyIf { file("src/main/web/package.json").exists() }
    // Don't fail the build if npm isn't installed; assets should be pre-built
    isIgnoreExitValue = true
}

tasks.named("preBuild") {
    dependsOn("buildWeb")
}
