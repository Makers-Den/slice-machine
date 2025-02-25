import fs from 'fs'
import path from 'path'
import base64Img from 'base64-img'

import { getPathToScreenshot } from '../../lib/queries/screenshot'
import { getEnv } from '../../lib/env'

export default async function handler(file, { from, sliceName, img }) {
  const { env } = await getEnv()

  const { path: filePath, isCustom } = getPathToScreenshot({ cwd: env.cwd, from, sliceName })

  if (isCustom) {
    fs.unlinkSync(filePath)
  }

  const dest = path.join(env.cwd, from, sliceName, `preview.${file.type.split('/')[1]}`)
  fs.renameSync(file.path, dest)

  return { previewUrl: base64Img.base64Sync(dest), isTouched: true }
}