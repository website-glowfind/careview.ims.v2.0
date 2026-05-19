import React from 'react'

const Layout = ({ children } : {children: React.ReactNode }) => {
  return (
    <div className='w-full'>
        <div className='flex'>
            <nav className='w-full bg-gray-200 p-4'>
                <h1>Navbar</h1>
            </nav>
        </div>
        <div>
            {children}
        </div>
    </div>
  )
}

export default Layout