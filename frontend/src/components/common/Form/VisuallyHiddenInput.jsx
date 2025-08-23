// Dùng kèm <label> bọc bên ngoài để click được:
/// <label className="inline-flex items-center gap-2">
//    <UploadIcon className="h-4 w-4" />
//    Upload
//    <VisuallyHiddenInput type="file" onChange={...} />
//  </label>

function VisuallyHiddenInput(props) {
  return <input className="sr-only" {...props} />
}

export default VisuallyHiddenInput
