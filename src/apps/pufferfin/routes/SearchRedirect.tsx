import React, { type FC, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

import { openSpotlight } from '../features/search/spotlight/store';

import { getHomePath } from './paths';

/** The former search address: the home, with the search panel open over it. */
const SearchRedirect: FC = () => {
    useEffect(() => openSpotlight(), []);
    return <Navigate replace to={getHomePath()} />;
};

export default SearchRedirect;
