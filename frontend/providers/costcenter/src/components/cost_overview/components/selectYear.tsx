import { INIT_YEAR, NOW_YEAR } from "@/constants/payment";
import useOverviewStore from "@/stores/overview";
import { memo } from "react";
import { Button, Img, Menu, MenuButton, MenuItem, MenuList, Select } from "@chakra-ui/react";
import arrow_icon from "@/assert/Vector.svg"
export const SelectYear = memo(function SelectYear() {
  const { selectedYear, setYear } = useOverviewStore(state => state)
  const items: number[] = Array.from({
    length: NOW_YEAR - INIT_YEAR + 1,
  },
    (_, offset) => INIT_YEAR + offset)

  return <Menu>{({ isOpen }) => <>
    <MenuButton as={Button} rightIcon={<Img src={arrow_icon.src} transition={'all'} transform={isOpen ? 'rotate(-180deg)' : 'rotate(0)'}></Img>}
      w='110px'
      h='32px'
      bg={'#F6F8F9'}
      _expanded={{
        background: '#F8FAFB',
        border: `1px solid #36ADEF`
      }}
      fontStyle='normal'
      fontWeight='400'
      fontSize='12px'
      lineHeight='140%'
      _hover={{
        background: '#F8FAFB',
        border: `1px solid #36ADEF`
      }}
      border={'1px solid #DEE0E2'}
      borderRadius={'2px'}
    >
      {selectedYear}
    </MenuButton>
    <MenuList p={'6px'} boxSizing='border-box' minW={'110px'} shadow={'0px 0px 1px 0px #798D9F40, 0px 2px 4px 0px #A1A7B340'
    }>
      {items.map((year, idx) => (<MenuItem key={year} onClick={() => {
        setYear(year)
      }
      }
       color={year === selectedYear ? '#0884DD' : '#5A646E'} 
       h='30px'
       bg={year === selectedYear ? '#F4F6F8' : '#FDFDFE'} >
        {year}
      </MenuItem>))}
      {/* <MenuItem>helkl</MenuItem> */}
    </MenuList>
  </>}

  </Menu>
})