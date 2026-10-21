param(
    [string]$SdkRoot = "$PSScriptRoot/../.tools/android-sdk",
    [string]$JdkRoot = 'C:/Program Files/Java/jdk-21',
    [string]$Architecture = 'x86_64',
    [ValidatePattern('^[D-Z]$')][string]$StagingDrive = 'S'
)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath("$PSScriptRoot/..")
$toolsRoot = Join-Path $repoRoot '.tools'
New-Item -ItemType Directory -Force $toolsRoot | Out-Null
if (Test-Path "${StagingDrive}:/") { throw "Drive $StagingDrive is already in use. Choose another -StagingDrive; it will not be replaced." }
subst "${StagingDrive}:" $toolsRoot
if ($LASTEXITCODE -ne 0) { throw 'Could not create short native staging path.' }
$previousLocation = Get-Location
try {
    Set-Location $repoRoot
    $env:JAVA_HOME = [IO.Path]::GetFullPath($JdkRoot)
    $env:ANDROID_HOME = [IO.Path]::GetFullPath($SdkRoot)
    $env:GRADLE_USER_HOME = Join-Path $toolsRoot 'gradle'
    $env:RIBBON_NATIVE_CXX = "${StagingDrive}:/cxx"
    $env:CMAKE_BUILD_PARALLEL_LEVEL = '2'
    $ninjaPath = Join-Path $toolsRoot 'ninja/ninja.exe'
    if (!(Test-Path -LiteralPath $ninjaPath)) { throw 'Install Ninja 1.13.2 from https://github.com/ninja-build/ninja/releases/tag/v1.13.2 into .tools/ninja first. The Android SDK Ninja is too old for long cached header paths.' }
    $env:RIBBON_NATIVE_NINJA = $ninjaPath
    if (!(Test-Path "$repoRoot/android/gradlew.bat")) {
        & npx.cmd expo prebuild --platform android --no-install
        if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' }
    }
    & "$repoRoot/android/gradlew.bat" -p "$repoRoot/android" -I "$repoRoot/scripts/windows-native.init.gradle" ':app:assembleRelease' "-PreactNativeArchitectures=$Architecture" '-Pkotlin.incremental=false' '--max-workers=2' '--console=plain'
    if ($LASTEXITCODE -ne 0) { throw 'Android APK build failed. See Gradle output.' }
    Write-Output "Local test APK: $repoRoot/android/app/build/outputs/apk/release/app-release.apk"
} finally {
    Set-Location $previousLocation
    subst "${StagingDrive}:" /D
}
