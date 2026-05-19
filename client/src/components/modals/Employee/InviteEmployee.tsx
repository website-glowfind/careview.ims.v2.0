import { Input } from '@/components/ui/input'
import MainModal from '../MainModal'
import type { ChildrenModalProps } from '@/lib/types'

const InviteEmployee = ({modalOpen, setModalOpen} : ChildrenModalProps) => {
  return ( 
    <MainModal modalOpen={modalOpen} setModalOpen={setModalOpen}>
        <div className='p-2 bg-gray-200 border rounded-md w-full shadow-md'>
          <h1 className='text-2xl font-bold pb-2'> Invite Employee </h1>
            <form className='grid grid-cols-2 md:grid-cols-4 gap-2 bg-white p-3'>
                <Input placeholder='First Name' className='col-span-2'/>
                <Input placeholder='Last Name' className='col-span-2'/>
                <Input placeholder='Email' className='col-span-2'/>
                <Input placeholder='Role' className='col-span-2'/>
                <Input placeholder='Password' className='col-span-2'/>
            </form>
        </div>
    </MainModal>
  )
}

export default InviteEmployee