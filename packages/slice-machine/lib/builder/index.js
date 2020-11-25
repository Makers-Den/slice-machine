import { mutate } from 'swr'
import { useState, useContext, useEffect } from 'react'
import { ModelContext } from 'src/model-context'
import { ConfigContext } from 'src/config-context'
import { Label, Checkbox, Text } from 'theme-ui';
 
import {
  Box,
  Flex,
} from 'theme-ui'

import {
  FlexEditor,
  SideBar,
  Success
} from './layout'

import PreviewFields from './modules/PreviewFields'

const createOnSaveUrl = ({
  sliceName,
  from,
  value,
  screenshotUrl
}) =>
  `/api/update?sliceName=${sliceName}&from=${from}&model=${btoa(JSON.stringify(value))}&screenshotUrl=${screenshotUrl}`

const createStorybookUrls = (storybook, componentInfo, variation = 'default-slice') => ({
  screenshotUrl: `${storybook}/iframe.html?id=${componentInfo.sliceName.toLowerCase()}--${variation}&viewMode=story`,
  storybookUrl: `${storybook}/?path=/story/${componentInfo.sliceName.toLowerCase()}--${variation}`
})

const Builder = ({ openPanel }) => {
  const [displaySuccess, setDisplaySuccess] = useState(false)
  const Model = useContext(ModelContext)
  const { env: { storybook }, warnings  } = useContext(ConfigContext)
  const {
    info,
    isTouched,
    value,
    hydrate,
    appendInfo,
    resetInitialModel,
  } = Model

  const [data, setData] = useState({
    imageLoading: false,
    loading: false,
    done: false,
    error: null,
  })

  const variation = Model.get().variation()

  const { screenshotUrl, storybookUrl } = createStorybookUrls(storybook, info, variation.id)

  const onSave = async () => {
    setData({ loading: true, done: false, error: null })
    fetch(createOnSaveUrl({
      ...info,
      value,
      screenshotUrl
    }), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',

      },
    }).then(async (res) => {
      if (res.status > 209) {
        const json = await res.json()
        return setData({
          loading: false,
          done: true,
          error: json.err,
          message: json.reason
        })
      }
      const newInfo = await res.json()
      hydrate(resetInitialModel(value, newInfo))
      mutate('/api/components')
      setData({
        loading: false,
        done: true,
        error: null,
        message: 'Model & mocks have been generated succesfully!'
      })
    })
  }

  useEffect(() => {
    if (isTouched) {
      setData({ loading: false, done: false, error: null })
    }
  }, [isTouched])

  // activate/deactivate Success message
  useEffect(() => {
    if (data.done) {
      setDisplaySuccess(true)
      setTimeout(() => {
        setDisplaySuccess(false)
        setData({ ...data, done: false })
      }, 2500)
    } else {
      setDisplaySuccess(false)
    }
  }, [data])


  const onPush = () => {
    setData({ loading: true, done: false, error: null })
    fetch(`/api/push?sliceName=${info.sliceName}&from=${info.from}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',

      },
    }).then(async res => {
      if (res.status > 209) {
        const json = await res.json()
        return setData({
          loading: false,
          done: true,
          error: json.err,
          message: 'An unexpected error occured while pushing slice to Prismic'
        })
      }
      const newInfo = await res.json()
      hydrate(resetInitialModel(value, newInfo))
      mutate('/api/components')
      setData({
        loading: false,
        done: true,
        error: null,
        message: 'Model was correctly saved to Prismic!'
      })
    })
  }

  const onScreenshot = () => {
    setData({
      ...data,
      imageLoading: true,
    })
    fetch(`/api/screenshot?sliceName=${info.sliceName}&from=${info.from}&screenshotUrl=${screenshotUrl}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // body: JSON.stringify({ sliceName, from, screenshotUrl })
    })
    .then(async res => {
      const json = await res.json()
      if (res.status > 209) {
        return setData({
          imageLoading: false,
          done: true,
          error: json.err,
          message: json.reason
        })
      }
      setData({
        imageLoading: false,
        done: true,
        error: null,
        message: 'New screenshot added!'
      })
      hydrate(appendInfo(json))
    })
  }
  const DEFAULT_CHECKED = false;
  const [showHints, setShowHints] = useState(DEFAULT_CHECKED);
  const onToggleHints = () => setShowHints(!showHints);

  return (
    <Box>
      <Flex
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          margin: '0 auto',
          maxWidth: 1224,
          mx: 'auto',
          px: 3,
          pt: 4,
        }}
      >

        <Box as="section" sx={{
          flexGrow: 99999,
          flexBasis: 0,
          minWidth: 320,
        }}>

          <Box as="h2" sx={{ pb:3}}>
            {info.sliceName}
          </Box>
          <hr />

        </Box>
      </Flex>

      <Success data={data} display={displaySuccess} />
      <FlexEditor
        sx={{ py: 4 }}
        SideBar={() => (
          <SideBar
            isTouched={isTouched}
            info={info}
            onPush={onPush}
            onSave={onSave}
            data={data}
            warnings={warnings}
            openPanel={openPanel}
            previewUrl={info.previewUrl}
            storybookUrl={storybookUrl}
            onScreenshot={onScreenshot}
            imageLoading={data.imageLoading}
            screenshotUrl={screenshotUrl}
          />
        )}
      >

        <Box sx={{ padding: '0px 24px', border: t => `1px solid ${t.colors.borders}`}}>
          <Box sx={{
            // display: 'block',
            width: '100%',
            padding: '18px 10px',
            margin: 0,
            justifyContent: 'flex-end'
          }}>
              <Label variant="hint" sx={{ justifyContent: 'flex-end', padding: '8px' }}>
                Show how to render field
                <Checkbox
                  sx={{ margin: '0 8px' }}
                  defaultChecked={DEFAULT_CHECKED}
                  onChange={onToggleHints}
                />
              </Label>
          </Box>
        
          <PreviewFields
            Model={Model}
            variation={variation}
            showHints={showHints}
          />
        </Box>

      </FlexEditor>
      {/* <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      /> */}
      {/* {
        data.done ? (
          <SuccessModal previewUrl={info.previewUrl} />
        ) : null
      } */}
    </Box>
  )
}

export default Builder