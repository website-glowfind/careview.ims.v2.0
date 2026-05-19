import { Fonts } from '@/utils/font';
import { User2, Plus, Users2 } from 'lucide-react';

import '@/fonts.css';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useState } from 'react';
import InviteEmployee from '@/components/modals/Employee/InviteEmployee';

const Employees = () => {
    const [inviteOnePersonModal, setInviteOnePersonModal] = useState(false);

    const handleInvite = () => {
        setInviteOnePersonModal(true);
    }
  return (
    <>
    <InviteEmployee modalOpen={inviteOnePersonModal} setModalOpen={setInviteOnePersonModal}/>
    <div className='container mx-auto p-4'>
        <div className='py-5'>
            
            <div className='flex flex-row py-2 justify-between'>
                <div className='gap-2'>
                    <span className='text-gray-400'>
                            Team
                    </span>
                    <h1 className={`sm:text-3xl transition ease-in-out text-xl font-bold ${Fonts.poppins}`}>
                        Employees
                    </h1>
                </div>
                    <Menu>
                        <MenuButton className="inline-flex items-center gap-2 rounded-md bg-blue-800 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-white data-hover:bg-blue-700 data-open:bg-blue-700">
                        
                            <Plus />
                            <span className='hidden lg:flex'>Invite Employees</span> 
                        
                        </MenuButton>

                        <MenuItems
                        transition
                        anchor="bottom end"
                        className="w-52 origin-top-right rounded-md border border-white bg-white p-1 text-sm/6 text-black transition duration-100 ease-out [--anchor-gap:--spacing(1)] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
                        >
                        <MenuItem>
                            <button onClick={handleInvite} className="group flex w-full hover:text-white hover:bg-blue-800/40 items-center gap-2 rounded-lg px-3 py-1.5 ">
                            <User2 className="size-4 fill-white/30" />
                            Invite one person
                            </button>
                        </MenuItem>
                        <div className="my-1 h-px bg-white/5" />
                        <MenuItem>
                            <button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:text-white hover:bg-blue-800/40">
                            <Users2 className="size-4 fill-white/30" />
                            Invite in bulk
                            </button>
                        </MenuItem>
                        
                       
                        </MenuItems>
                    </Menu>
                <div className="fixed top-24 w-52 text-right">
                    
                </div>
            </div>
        </div>
    </div>
    </>
  )
}

export default Employees