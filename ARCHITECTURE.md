# Architecture Documentation

## System Overview

The AI Virtual Fashion Mirror is a real-time computer vision application that enables virtual try-on of clothing. The system is designed with a modular architecture that separates concerns between UI, application logic, and computer vision processing.

## Design Principles

1. **Separation of Concerns**: UI, CV processing, and business logic are separated
2. **Modularity**: Each component can be developed, tested, and replaced independently
3. **Performance-First**: Optimized for real-time processing (30+ FPS)
4. **Privacy-First**: Client-side processing by default
5. **Extensibility**: Architecture supports future AI/ML integration

## Architecture Layers

### 1. Presentation Layer (UI)

**Location**: `src/components/`, `src/hooks/`

**Responsibilities**:
- User interface rendering
- User interaction handling
- State management for UI
- Integration with application layer

**Key Components**:
- `VirtualTryOn.tsx`: Main application component
- `useVirtualTryOn.ts`: Custom hook for CV pipeline integration

**Technology**:
- React 19 with TypeScript
- Tailwind CSS for styling
- Custom hooks for state management

### 2. Application Layer

**Location**: `src/hooks/useVirtualTryOn.ts`

**Responsibilities**:
- Orchestrate CV pipeline
- Manage application state
- Handle errors and user feedback
- Coordinate between CV engines and UI

**Key Functions**:
- Initialize CV models
- Start/stop camera
- Load/remove clothing
- Process frames in real-time
- Apply smoothing to transformations

### 3. Computer Vision Layer

**Location**: `src/camera/`, `src/pose/`, `src/segmentation/`, `src/clothing/`, `src/occlusion/`, `src/rendering/`

**Responsibilities**:
- Camera access and frame capture
- Pose detection and tracking
- Body segmentation
- Clothing processing and transformation
- Occlusion handling
- GPU-accelerated rendering

#### Sub-Components

##### CameraManager
- **Purpose**: Manage camera lifecycle and frame capture
- **Technology**: MediaDevices API, WebRTC
- **Key Methods**:
  - `start(videoElement)`: Initialize camera stream
  - `stop()`: Release camera resources
  - `onFrame(callback)`: Register frame callback
  - `switchCamera()`: Toggle front/rear camera

##### PoseDetector
- **Purpose**: Detect and track human pose landmarks
- **Technology**: MediaPipe Pose
- **Key Methods**:
  - `initialize()`: Load pose model
  - `detect(image)`: Detect pose landmarks
  - `getShoulderDistance(pose)`: Calculate shoulder width
  - `getTorsoHeight(pose)`: Calculate torso height
  - `getTorsoCenter(pose)`: Calculate torso center
  - `getTorsoRotation(pose)`: Calculate torso rotation

##### SegmentationEngine
- **Purpose**: Separate user from background
- **Technology**: MediaPipe Selfie Segmentation
- **Key Methods**:
  - `initialize()`: Load segmentation model
  - `segment(image)`: Generate segmentation mask
  - `calculateConfidence(mask)`: Estimate segmentation quality

##### ClothingEngine
- **Purpose**: Process clothing images and calculate transformations
- **Technology**: Canvas API, image processing
- **Key Methods**:
  - `loadClothingImage(file)`: Load and process clothing
  - `loadClothingFromUrl(url)`: Load clothing from URL
  - `detectCategory(imageData)`: Classify clothing type
  - `calculateTransformation(pose, clothing)`: Compute transformation matrix
  - `removeBackground(imageData)`: Remove clothing background

##### OcclusionEngine
- **Purpose**: Handle body-clothing occlusion
- **Technology**: Mask processing, region detection
- **Key Methods**:
  - `setSegmentationMask(mask)`: Set body mask
  - `getOcclusionMask(pose)`: Generate occlusion regions
  - `compositeWithOcclusion()`: Layer composition

##### Renderer
- **Purpose**: GPU-accelerated rendering of all layers
- **Technology**: Canvas API, hardware acceleration
- **Key Methods**:
  - `render(...)`: Compose and render all layers
  - `setLayerVisibility()`: Toggle layer visibility
  - `captureFrame()`: Capture current frame
  - `getFps()`: Get current frame rate

### 4. Utility Layer

**Location**: `src/utils/`, `src/config/`, `src/types/`

**Responsibilities**:
- Configuration management
- Type definitions
- Utility functions (smoothing, transforms)
- Shared constants

#### Smoothing Utilities

**Purpose**: Stabilize tracking to prevent jitter

**Implementations**:
- `ExponentialSmoother`: Simple exponential moving average
- `VectorSmoother`: 2D coordinate smoothing
- `KalmanFilter`: Noise reduction with prediction
- `MovingAverage`: Window-based averaging
- `TrackingSmoother`: Combined smoothing for tracking

**Configuration**:
```typescript
SMOOTHING_FACTOR: 0.7  // Higher = more smoothing
```

## Data Flow

### Frame Processing Pipeline

```
1. Camera Capture
   CameraManager captures frame at target FPS
   ↓
2. Pose Detection
   PoseDetector processes frame → 33 landmarks
   ↓
3. Transformation Calculation
   ClothingEngine computes transform based on landmarks
   ↓
4. Smoothing
   TrackingSmoother applies smoothing to transform
   ↓
5. Rendering
   Renderer composes layers and renders to canvas
   ↓
6. Display
   User sees virtual clothing on their body
```

### State Management

**Application State** (managed by `useVirtualTryOn`):
```typescript
{
  isInitialized: boolean
  isCameraActive: boolean
  isTracking: boolean
  currentClothing: ClothingImage | null
  pose: Pose | null
  transformation: ClothingTransformation | null
  error: AppError | null
  fps: number
}
```

**CV Engine State** (managed by individual engines):
- PoseDetector: Last detected pose
- SegmentationEngine: Current segmentation mask
- ClothingEngine: Current clothing image
- OcclusionEngine: Current occlusion mask
- Renderer: Layer visibility, debug mode

## Component Interactions

### Initialization Sequence

```
1. UI mounts
   ↓
2. useVirtualTryOn hook initializes
   ↓
3. CV engines created (CameraManager, PoseDetector, etc.)
   ↓
4. CV models loaded (async)
   ↓
5. Renderer initialized with canvas
   ↓
6. User starts camera
   ↓
7. Frame processing loop begins
```

### Frame Processing Loop

```
while (cameraActive) {
  1. Capture frame from camera
  2. Detect pose landmarks
  3. If pose detected:
     a. Calculate clothing transformation
     b. Apply smoothing
     c. Update state
  4. Render frame with all layers
  5. Update FPS counter
  6. Request next frame
}
```

### Clothing Loading Flow

```
1. User selects/upload clothing image
   ↓
2. ClothingEngine loads image
   ↓
3. Background removal (if enabled)
   ↓
4. Category detection
   ↓
5. Anchor point detection
   ↓
6. Clothing object created
   ↓
7. State updated with new clothing
   ↓
8. Renderer shows clothing on next frame
```

## Performance Considerations

### Frame Rate Targeting

- **Target FPS**: 30 (configurable)
- **Minimum FPS**: 15 (below this, quality degrades)
- **Maximum FPS**: 60 (limited by device)

### Latency Budget

- **Total Budget**: 33ms (for 30 FPS)
- **Pose Detection**: ~15-20ms
- **Transformation**: ~1-2ms
- **Rendering**: ~5-10ms
- **Smoothing**: <1ms

### Memory Management

- **Model Loading**: One-time cost (~50-100MB)
- **Frame Buffer**: ~10MB per frame
- **Clothing Image**: ~5-20MB depending on size
- **Total Runtime**: ~200-500MB typical

### Optimization Strategies

1. **Model Reuse**: CV models loaded once, reused
2. **Frame Skipping**: Skip frames if processing exceeds budget
3. **GPU Acceleration**: Canvas uses hardware acceleration
4. **Efficient Canvas Ops**: Minimize context switches
5. **Lazy Loading**: Models loaded on-demand
6. **Web Workers**: Offload CPU work (future)

## Error Handling

### Error Types

```typescript
enum ErrorType {
  CAMERA_PERMISSION_DENIED,
  CAMERA_UNAVAILABLE,
  NO_PERSON_DETECTED,
  MULTIPLE_PEOPLE_DETECTED,
  CLOTHING_IMAGE_INVALID,
  MODEL_LOADING_FAILED,
  LOW_PERFORMANCE,
  UNKNOWN
}
```

### Error Handling Strategy

1. **Preventive**: Validate inputs before processing
2. **Graceful Degradation**: Continue with reduced functionality
3. **User Feedback**: Show clear, actionable error messages
4. **Recovery**: Provide recovery options where possible
5. **Logging**: Log errors for debugging (dev mode only)

### Example Error Flow

```
Camera permission denied
  ↓
CameraManager throws error
  ↓
useVirtualTryOn catches error
  ↓
Error state updated
  ↓
UI shows error message
  ↓
User can retry or use different camera
```

## Testing Strategy

### Unit Tests

**Target**: Utility functions and CV calculations

**Examples**:
- Smoothing algorithms
- Transformation calculations
- Coordinate conversions
- Configuration parsing

**Location**: `src/utils/*.test.ts`, `src/clothing/*.test.ts`

### Integration Tests

**Target**: Component interactions

**Examples**:
- Camera → Pose detection
- Pose → Transformation
- Transformation → Rendering

**Location**: `src/hooks/*.test.ts` (future)

### UI Tests

**Target**: User interactions

**Examples**:
- Camera start/stop
- Clothing upload
- Error states
- Responsive layout

**Location**: `src/components/*.test.tsx` (future)

### Performance Tests

**Target**: Frame rate and latency

**Metrics**:
- FPS stability
- Frame processing time
- Memory usage
- Model loading time

**Location**: `src/performance/*.test.ts` (future)

## Security Considerations

### Client-Side Processing

- Camera frames never leave the browser
- No credentials in local storage
- No persistent user data
- HTTPS required for camera access

### Input Validation

- File type validation for uploads
- File size limits
- Image format validation
- URL validation for remote images

### Future: Backend Integration

If backend is added:
- Secure API endpoints
- Rate limiting
- Input sanitization
- Authentication/authorization
- Data encryption in transit

## Future Architecture Extensions

### Generative AI Integration

Current architecture supports adding generative AI:

```
Current:
Pose + Segmentation + Clothing → Transformation → Render

Future:
Pose + Segmentation + Clothing → Generative Model → Photorealistic Render
```

**Integration Points**:
- Replace `ClothingEngine.calculateTransformation` with generative model
- Keep same pose/segmentation inputs
- Add model loading to initialization
- Update rendering to handle generative output

### Backend Services

If backend is needed:

```
Client (Current Architecture)
  ↓
API Layer (FastAPI/Express)
  ↓
Service Layer
  ↓
Database (PostgreSQL)
  ↓
Storage (S3/R2)
```

**Reasons for Backend**:
- User accounts and wardrobe persistence
- Product catalog integration
- Advanced AI models too large for client
- Analytics and usage tracking

### Mobile App

React Native version can reuse:

- CV logic (with platform-specific adaptations)
- State management
- Business logic
- Configuration

**Platform-specific**:
- Camera access (native APIs)
- Rendering (native view components)
- UI (React Native components)

## Deployment

### Build Process

```bash
npm run build
```

Produces:
- Optimized JavaScript bundles
- Minified CSS
- Asset optimization
- Source maps (dev mode)

### Hosting Options

1. **Static Hosting**: Vercel, Netlify, GitHub Pages
2. **CDN**: Cloudflare, AWS CloudFront
3. **Server**: Nginx, Apache with HTTPS

### Environment Variables

Create `.env` file:

```env
VITE_API_URL=https://api.example.com
VITE_ENABLE_DEBUG=false
VITE_TARGET_FPS=30
```

## Monitoring and Debugging

### Debug Mode

Enable in `src/config/index.ts`:

```typescript
RENDERING: {
  ENABLE_DEBUG_MODE: true,
  SHOW_LANDMARKS: true,
  SHOW_MASK: true,
  SHOW_PERFORMANCE: true,
}
```

Shows:
- Pose landmarks overlay
- Segmentation mask
- FPS and render time
- Tracking status

### Performance Monitoring

Built-in metrics:
- FPS
- Frame time
- Model inference time
- Memory usage (where available)

### Logging

Console logging in dev mode:
- Model loading status
- Frame processing errors
- Tracking confidence
- Transformation values

## Conclusion

This architecture provides a solid foundation for a real-time virtual try-on system while maintaining flexibility for future enhancements. The modular design allows independent development and testing of components, and the performance optimizations ensure smooth user experience across devices.
